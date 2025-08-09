const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// 处理文件重名的函数
function getUniqueFileName(filePath) {
  if (!fs.existsSync(filePath)) {
    return filePath;
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  
  let counter = 1;
  let newFilePath = filePath;
  
  while (fs.existsSync(newFilePath)) {
    newFilePath = path.join(dir, `${name}(${counter})${ext}`);
    counter++;
  }
  
  return newFilePath;
}

app.post('/upload', (req, res) => {
  const { filename, content, folder } = req.body;
  if (!filename || !content) {
    console.error('Upload failed: Filename or content missing.');
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  const targetDir = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
  let filePath = path.join(targetDir, filename);

  // 检查并处理重名文件
  filePath = getUniqueFileName(filePath);

  fs.mkdir(targetDir, { recursive: true }, (err) => {
    if (err) {
      console.error(`Error creating folder: ${err}`);
      return res.status(500).json({ error: 'Failed to create folder' });
    }

    fs.writeFile(filePath, content, (err) => {
      if (err) {
        console.error(`Error writing file: ${err}`);
        return res.status(500).json({ error: 'Failed to save file' });
      }
      const uniqueFilename = path.basename(filePath);
      console.log(`File written successfully: ${uniqueFilename}`);
      const barkUrl = process.env.BARK_URL;
      if (barkUrl) {
        // 添加重试机制和更详细的错误处理
        const sendBarkNotification = async (url, retries = 3) => {
          // 创建自定义HTTPS代理，忽略证书验证问题
          const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true,
            timeout: 5000
          });

          for (let i = 0; i < retries; i++) {
            try {
              console.log(`Attempting to send Bark notification (attempt ${i + 1}/${retries})`);
              const response = await axios.get(url, { 
                timeout: 5000,
                httpsAgent: httpsAgent
              });
              console.log('Bark notification sent successfully:', response.status);
              return response;
            } catch (error) {
              console.error(`Error sending Bark notification (attempt ${i + 1}/${retries}):`, {
                message: error.message,
                code: error.code,
                response: error.response ? error.response.status : 'N/A'
              });
              
              // 如果是最后一次尝试，抛出错误
              if (i === retries - 1) {
                throw error;
              }
              
              // 等待一段时间后重试
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
          }
        };

        sendBarkNotification(barkUrl)
          .then(() => {
            console.log('Bark notification completed');
          })
          .catch(error => {
            console.error('Failed to send Bark notification after all retries:', error.message);
          });
      } else {
        console.log('BARK_URL not configured, skipping notification');
      }
      res.json({ message: 'File uploaded successfully!', filename: uniqueFilename });
    });
  });
});

app.get('/files', (req, res) => {
  const dirPath = req.query.path ? path.join(UPLOADS_DIR, req.query.path) : UPLOADS_DIR;
  const currentPath = req.query.path || '';

  fs.readdir(dirPath, { withFileTypes: true }, (err, dirents) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return res.status(500).json({ error: 'Failed to list files' });
    }
    const files = dirents.map((dirent) => {
      return {
        name: dirent.name,
        type: dirent.isDirectory() ? 'folder' : 'file'
      };
    });
    res.json({ files, currentPath });
  });
});

app.use('/content', (req, res) => {
  const filePath = req.path.substring(1); // 移除开头的斜杠
  res.sendFile(path.join(UPLOADS_DIR, filePath));
});

app.get('/folders', (req, res) => {
  const readDirRecursive = (dir) => {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    let folders = [];
    dirents.forEach((dirent) => {
      if (dirent.isDirectory()) {
        const fullPath = path.join(dir, dirent.name);
        folders.push(path.relative(UPLOADS_DIR, fullPath));
        folders = folders.concat(readDirRecursive(fullPath));
      }
    });
    return folders;
  };

  try {
    const folders = readDirRecursive(UPLOADS_DIR);
    res.json(['.', ...folders]);
  } catch (err) {
    console.error(`Error reading uploads directory: ${err}`);
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

app.post('/folders', (req, res) => {
  const { folderName } = req.body;
  if (!folderName) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  const folderPath = path.join(UPLOADS_DIR, folderName);
  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      console.error(`Error creating folder: ${err}`);
      return res.status(500).json({ error: 'Failed to create folder' });
    }
    console.log(`Folder created successfully: ${folderName}`);
    res.json({ message: 'Folder created successfully!' });
  });
});

app.post('/move', (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'Both old and new paths are required' });
  }

  const oldAbsPath = path.join(UPLOADS_DIR, oldPath);
  let newAbsPath = path.join(UPLOADS_DIR, newPath);

  // 检查目标路径是否是源路径的子目录（防止文件夹被移动到自身内部）
  if (fs.statSync(oldAbsPath).isDirectory() && newAbsPath.startsWith(oldAbsPath + path.sep)) {
    return res.status(400).json({ error: 'Cannot move folder into itself' });
  }

  // 检查并处理重名文件/文件夹
  newAbsPath = getUniqueFileName(newAbsPath);

  fs.rename(oldAbsPath, newAbsPath, (err) => {
    if (err) {
      console.error(`Error moving file/folder: ${err}`);
      return res.status(500).json({ error: 'Failed to move file/folder' });
    }
    const uniqueNewPath = path.relative(UPLOADS_DIR, newAbsPath);
    console.log(`File/folder moved successfully: from ${oldPath} to ${uniqueNewPath}`);
    res.json({ message: 'File/folder moved successfully!', newPath: uniqueNewPath });
  });
});

app.use('/delete', (req, res) => {
  if (req.method === 'DELETE') {
    const filePath = req.path.substring(1); // 移除开头的斜杠
    const absPath = path.join(UPLOADS_DIR, filePath);

    fs.unlink(absPath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${err}`);
        return res.status(500).json({ error: 'Failed to delete file' });
      }
      console.log(`File deleted successfully: ${filePath}`);
      res.json({ message: 'File deleted successfully!' });
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

// 删除文件夹的端点
app.delete('/folders/:folderPath(*)', (req, res) => {
  const folderPath = req.params.folderPath;
  const absPath = path.join(UPLOADS_DIR, folderPath);

  fs.rm(absPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error(`Error deleting folder: ${err}`);
      return res.status(500).json({ error: 'Failed to delete folder' });
    }
    console.log(`Folder deleted successfully: ${folderPath}`);
    res.json({ message: 'Folder deleted successfully!' });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
