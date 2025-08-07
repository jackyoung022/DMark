# DMark

DMark 是一个基于 Web 的 Markdown 文档管理系统，允许用户通过简单的界面创建、编辑、组织和查看 Markdown 文件。

## 功能特性

- **文件管理**：创建、删除、移动 Markdown 文件和文件夹
- **重名处理**：自动处理文件重名问题，在文件名后添加数字区分
- **文件夹支持**：创建文件夹来组织文档
- **Markdown 渲染**：实时渲染 Markdown 文件内容
- **路径显示**：清晰显示当前所在文件夹路径
- **批量操作**：支持批量删除文件
- **现代化界面**：采用 Catppuccin 配色方案，界面美观舒适

## 技术栈

- **前端**：HTML, Tailwind CSS, JavaScript
- **后端**：Node.js, Express
- **部署**：Docker, Docker Compose

## 快速开始

### 环境要求

- Docker
- Docker Compose

### 安装与运行

1. 克隆项目仓库：
   ```bash
   git clone <repository-url>
   cd DMark
   ```

2. 启动服务：
   ```bash
   docker-compose up -d
   ```

3. 访问应用：
   - 前端界面：http://localhost:3000
   - 后端API：http://localhost:3001

### 停止服务

```bash
docker-compose down
```

## 使用说明

### 创建文件夹

1. 点击 "Create Folder" 按钮
2. 输入文件夹名称
3. 文件夹将出现在当前目录中

### 上传文件

通过 API 上传 Markdown 文件：

```bash
curl -X POST http://localhost:3001/upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"example.md", "content":"# Hello World", "folder":"path/to/folder"}'
```

### 文件操作

- **查看文件**：点击文件名即可在右侧查看渲染后的 Markdown 内容
- **移动文件/文件夹**：点击 "Move" 按钮，选择目标文件夹
- **删除文件**：点击 "Delete" 按钮确认删除
- **批量删除文件**：选中多个文件的复选框，然后点击 "Delete Selected" 按钮

### 导航

- **进入文件夹**：点击文件夹图标
- **返回上级**：点击 "Back" 按钮
- **返回根目录**：直接访问 http://localhost:3000

## API 接口

### 上传文件

```
POST /upload
Content-Type: application/json

{
  "filename": "example.md",
  "content": "# Hello World\nThis is a sample Markdown file.",
  "folder": "optional/path"
}
```

### 获取文件列表

```
GET /files?path=optional/path
```

### 获取文件夹列表

```
GET /folders
```

### 创建文件夹

```
POST /folders
Content-Type: application/json

{
  "folderName": "new-folder"
}
```

### 移动文件/文件夹

```
POST /move
Content-Type: application/json

{
  "oldPath": "old/path/file.md",
  "newPath": "new/path/file.md"
}
```

### 删除文件

```
DELETE /delete/path/to/file.md
```

### 删除文件夹

```
DELETE /folders/path/to/folder
```

## 开发

### 项目结构

```
DMark/
├── client/          # 前端代码
│   ├── index.html   # 主页面
│   ├── input.css    # Tailwind CSS 输入文件
│   └── tailwind.config.js  # Tailwind 配置
├── server/          # 后端代码
│   ├── index.js     # 主服务文件
│   ├── uploads/     # 上传文件存储目录
│   └── package.json # Node.js 依赖
└── docker-compose.yml  # Docker Compose 配置
```

### 本地开发

1. 启动后端服务：
   ```bash
   cd server
   npm install
   npm start
   ```

2. 启动前端服务：
   ```bash
   cd client
   npm install
   npm run build:css  # 构建 Tailwind CSS
   # 使用任何 HTTP 服务器启动前端，例如：
   npx http-server
   ```

## 许可证

[待定]

## 联系方式

[待定]