const http = require('http');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');

// 创建服务器函数
async function createUploadServer(port = 3000, uploadDir = process.cwd()) {
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const server = http.createServer(async (req, res) => {
        // 设置 CORS 头部
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === 'GET' && req.url === '/') {
            // 返回上传页面
            const html = getUploadHTML();
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        } else if (req.method === 'POST' && req.url === '/upload') {
            // 处理文件上传
            await handleFileUpload(req, res, uploadDir);
        } else if (req.method === 'GET' && req.url === '/files') {
            // 返回已上传的文件列表
            const files = getFileList(uploadDir);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                uploadDir,
                files: files
            }));
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });

    server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(`地址: ${url}`);
        console.log(`上传目录: ${uploadDir}`);
    });

    return server;
}

// 处理文件上传
async function handleFileUpload(req, res, uploadDir) {
    try {
        const boundary = req.headers['content-type'].split('boundary=')[1];
        const body = await getRequestBody(req);

        if (!boundary) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '无效的Content-Type' }));
            return;
        }

        const files = parseMultipartData(body, boundary, uploadDir);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: true,
            message: `成功上传 ${files.length} 个文件`,
            files: files
        }));
    } catch (error) {
        console.error('上传失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '上传失败: ' + error.message }));
    }
}

// 获取请求体
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// 解析 multipart/form-data
function parseMultipartData(buffer, boundary, uploadDir) {
    const boundaryBuffer = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;

    while (start < buffer.length) {
        const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
        if (boundaryIndex === -1) break;

        if (start !== 0) {
            const part = buffer.slice(start, boundaryIndex);
            parts.push(part);
        }

        start = boundaryIndex + boundaryBuffer.length;
    }

    const uploadedFiles = [];

    parts.forEach(part => {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;

        const headers = part.slice(0, headerEnd).toString();
        const content = part.slice(headerEnd + 4, part.length - 2);

        const filenameMatch = headers.match(/filename="(.+?)"/);
        const nameMatch = headers.match(/name="(.+?)"/);

        if (filenameMatch && filenameMatch[1] && nameMatch) {
            const filename = filenameMatch[1];
            const fieldName = nameMatch[1];

            // 处理文件夹上传（包含路径）
            let filePath;
            if (fieldName === 'folderFiles' && filename.includes('/')) {
                // 文件夹上传，保持目录结构
                filePath = path.join(uploadDir, filename);
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            } else {
                // 单文件上传
                filePath = path.join(uploadDir, path.basename(filename));
            }

            // 避免文件名冲突
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filename);
                const name = path.basename(filename, ext);
                const dir = path.dirname(filePath);
                let counter = 1;
                do {
                    filePath = path.join(dir, `${name}-${counter}${ext}`);
                    counter++;
                } while (fs.existsSync(filePath));
            }

            fs.writeFileSync(filePath, content);
            uploadedFiles.push({
                originalName: filename,
                savedPath: path.relative(uploadDir, filePath),
                size: content.length
            });
        }
    });

    return uploadedFiles;
}

// 获取文件列表
function getFileList(dir, relativePath = '') {
    const files = [];
    const maxFileCount = 1000;
    const items = fs.readdirSync(path.join(dir, relativePath));

    items.forEach(item => {
        if (files.length >= maxFileCount) return;
        const fullPath = path.join(dir, relativePath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push({
                name: item,
                type: 'directory',
                path: path.join(relativePath, item),
                children: getFileList(dir, path.join(relativePath, item))
            });
        } else {
            files.push({
                name: item,
                type: 'file',
                path: path.join(relativePath, item),
                size: stat.size,
                modified: stat.mtime
            });
        }
    });

    return files;
}

// 生成上传页面 HTML
function getUploadHTML() {
    return fs.readFileSync(path.join(__dirname, '../template/file/upload.html'), 'utf-8');
}

module.exports = createUploadServer;
