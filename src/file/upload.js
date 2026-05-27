const Koa = require('koa');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const { getIps } = require("../utils");

async function createUploadServer(port = 3000, uploadDir = process.cwd(), maxFileSize = 10, maxTotalFileSize = 20, allowDownload = false) {
    uploadDir = path.resolve(uploadDir);

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const app = new Koa();

    app.use(async (ctx) => {
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        ctx.set('Access-Control-Allow-Headers', 'Content-Type');

        try {
            if (ctx.method === 'OPTIONS') {
                ctx.status = 200;
                return;
            }

            if (ctx.method === 'GET' && ctx.path === '/') {
                ctx.type = 'html';
                ctx.body = getUploadHTML(allowDownload);
                return;
            }

            if (ctx.method === 'POST' && ctx.path === '/upload') {
                ctx.body = await handleFileUpload(ctx.req, uploadDir, maxFileSize, maxTotalFileSize);
                return;
            }

            if (ctx.method === 'GET' && ctx.path === '/files') {
                if (!allowDownload) {
                    ctx.status = 403;
                    ctx.body = { error: 'Download is disabled' };
                    return;
                }

                const currentPath = normalizeRelativePath(ctx.query.path || '');
                const files = getFileList(uploadDir, currentPath);
                ctx.body = {
                    uploadDir,
                    currentPath,
                    files: files
                };
                return;
            }

            if (ctx.method === 'GET' && ctx.path === '/download') {
                if (!allowDownload) {
                    ctx.status = 403;
                    ctx.body = { error: 'Download is disabled' };
                    return;
                }

                const filePath = resolveUploadPath(uploadDir, ctx.query.path || '');
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    ctx.status = 400;
                    ctx.body = { error: 'Cannot download a directory' };
                    return;
                }

                ctx.attachment(path.basename(filePath));
                ctx.body = fs.createReadStream(filePath);
                return;
            }

            if (ctx.method === 'GET' && ctx.path === '/view') {
                if (!allowDownload) {
                    ctx.status = 403;
                    ctx.body = { error: 'Download is disabled' };
                    return;
                }

                const filePath = resolveUploadPath(uploadDir, ctx.query.path || '');
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    ctx.status = 400;
                    ctx.body = { error: 'Cannot view a directory' };
                    return;
                }

                if (!isTextFile(filePath)) {
                    ctx.status = 400;
                    ctx.body = { error: 'Only text files can be viewed' };
                    return;
                }

                ctx.type = 'text';
                ctx.body = fs.createReadStream(filePath);
                return;
            }

            ctx.status = 404;
            ctx.type = 'text';
            ctx.body = 'Not Found';
        } catch (error) {
            ctx.status = error.status || 500;
            ctx.body = { error: error.message };
        }
    });

    const server = app.listen(port, () => {
        console.log(`Address: http://localhost:${port}`);
        getIps().map(ip => {
            console.log(`Address: http://${ip}:${port}`);
        })
        console.log(`Upload directory: ${uploadDir}`);
    });

    return server;
}

async function handleFileUpload(req, uploadDir, maxFileSize = 10, maxTotalFileSize = 20) {
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

        const { files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ fields, files });
            });
        });

        const uploadedFiles = [];
        const fileArray = normalizeFiles(files.files);
        const folderFileArray = normalizeFiles(files.folderFiles);
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

        console.log(`Successfully uploaded ${uploadedFiles.length} file(s)`);

        return {
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            files: uploadedFiles
        };
    } catch (error) {
        console.error('Upload failed:', error);
        error.status = error.status || 500;
        throw error;
    }
}

function normalizeFiles(files) {
    if (!files) return [];
    return Array.isArray(files) ? files : [files];
}

function handleFilePlacement(file, originalName, uploadDir) {
    const tempPath = file.filepath;

    let finalPath;
    if (originalName && originalName.includes('/')) {
        finalPath = path.join(uploadDir, originalName);
        const dir = path.dirname(finalPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } else {
        finalPath = path.join(uploadDir, path.basename(originalName || file.newFilename));
    }

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

    fs.renameSync(tempPath, finalPath);

    return finalPath;
}

function getFileList(dir, relativePath = '') {
    const files = [];
    const maxFileCount = 1000;
    const currentDir = resolveUploadPath(dir, relativePath);
    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
        if (files.length >= maxFileCount) return;
        const itemPath = path.join(relativePath, item);
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push({
                name: item,
                type: 'directory',
                path: toWebPath(itemPath),
                modified: stat.mtime,
            });
        } else {
            files.push({
                name: item,
                type: 'file',
                path: toWebPath(itemPath),
                isText: isTextFile(fullPath),
                size: stat.size,
                modified: stat.mtime
            });
        }
    });

    return files;
}

function normalizeRelativePath(relativePath) {
    return toWebPath(String(relativePath || '').replace(/^[/\\]+/, ''));
}

function resolveUploadPath(uploadDir, relativePath) {
    const normalizedPath = normalizeRelativePath(relativePath);
    const resolvedPath = path.resolve(uploadDir, normalizedPath);
    const relativeToRoot = path.relative(uploadDir, resolvedPath);

    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        const error = new Error('Invalid path');
        error.status = 400;
        throw error;
    }

    if (!fs.existsSync(resolvedPath)) {
        const error = new Error('Path not found');
        error.status = 404;
        throw error;
    }

    return resolvedPath;
}

function toWebPath(filePath) {
    return filePath.split(path.sep).join('/');
}

function isTextFile(filePath) {
    const textExtensions = new Set([
        '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.htm',
        '.xml', '.csv', '.log', '.yml', '.yaml', '.ini', '.conf', '.config', '.env',
        '.gitignore', '.npmrc', '.prettierrc', '.eslintrc'
    ]);
    const ext = path.extname(filePath).toLowerCase();

    return textExtensions.has(ext) || textExtensions.has(path.basename(filePath).toLowerCase());
}

function getUploadHTML(allowDownload) {
    return fs
        .readFileSync(path.join(__dirname, 'upload.html'), 'utf8')
        .replace('__ALLOW_DOWNLOAD__', JSON.stringify(Boolean(allowDownload)));
}

module.exports = createUploadServer;
