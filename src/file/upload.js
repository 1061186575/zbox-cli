const http = require('http');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const { getIps } = require("../utils");

// 创建服务器函数
async function createUploadServer(port = 3000, uploadDir = process.cwd(), maxFileSize = 10, maxTotalFileSize = 20) {
    uploadDir = path.resolve(uploadDir);
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
            await handleFileUpload(req, res, uploadDir, maxFileSize, maxTotalFileSize);
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
        console.log(`地址: http://localhost:${port}`);
        getIps().map(ip => {
            console.log(`地址: http://${ip}:${port}`);
        })
        console.log(`上传目录: ${uploadDir}`);
    });

    return server;
}

// 处理文件上传
async function handleFileUpload(req, res, uploadDir, maxFileSize = 10, maxTotalFileSize = 20) {
    try {
        const form = new formidable.IncomingForm({
            uploadDir: uploadDir,
            keepExtensions: true,
            maxFileSize: maxFileSize * 1024 * 1024 * 1024,
            maxTotalFileSize: maxTotalFileSize * 1024 * 1024 * 1024,
            multiples: true,
            allowEmptyFiles: true,
            minFileSize: 0,
        });

        const uploadedFiles = [];

        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('上传失败:', err);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: err.message }));
                return;
            }

            // 处理上传的文件
            const fileArray = files.files || [];
            const folderFileArray = files.folderFiles || [];

            // 合并所有文件
            const allFiles = [...fileArray, ...folderFileArray];

            allFiles.forEach(file => {
                if (file && file.filepath) {
                    const originalName = file.originalFilename || file.newFilename;
                    const finalPath = handleFilePlacement(file, originalName, uploadDir);

                    uploadedFiles.push({
                        originalName: originalName,
                        savedPath: finalPath,
                        size: file.size
                    });
                }
            });

            console.log(`成功上传 ${uploadedFiles.length} 个文件`);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                success: true,
                message: `成功上传 ${uploadedFiles.length} 个文件`,
                files: uploadedFiles
            }));
        });

    } catch (error) {
        console.error('上传失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

// 处理文件放置和冲突解决
function handleFilePlacement(file, originalName, uploadDir) {
    const tempPath = file.filepath;

    // 确定最终路径
    let finalPath;
    if (originalName && originalName.includes('/')) {
        // 文件夹上传，保持目录结构
        finalPath = path.join(uploadDir, originalName);
        const dir = path.dirname(finalPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } else {
        // 单文件上传
        finalPath = path.join(uploadDir, path.basename(originalName || file.newFilename));
    }

    // 处理文件名冲突
    if (fs.existsSync(finalPath)) {
        const ext = path.extname(finalPath);
        const name = path.basename(finalPath, ext);
        const dir = path.dirname(finalPath);
        let counter = 1;
        do {
            finalPath = path.join(dir, `${name}-${counter}${ext}`);
            counter++;
        } while (fs.existsSync(finalPath));
    }

    // 移动文件到最终位置
    fs.renameSync(tempPath, finalPath);

    return finalPath;
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
                modified: stat.mtime,
                // children: getFileList(dir, path.join(relativePath, item))
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
    return fs.readFileSync(path.join(__dirname, 'upload.html'), 'utf8');
}

module.exports = createUploadServer;
