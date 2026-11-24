const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getIps } = require('../utils');

const pageTemplate = fs.readFileSync(path.join(__dirname, 'text.html'), 'utf8');

const texts = [];
const maxTextsLength = 200;
const textMaxBytes = 10 * 1024 * 1024;
const StorageType = {
    MEMORY: 'memory',
    FILE: 'file',
};
const fileStoragePath = process.env.ZBOX_TEXT_STORAGE_PATH || path.join(os.tmpdir(), 'zbox-network-text.json');

function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function linkify(text) {
    const urlReg = /(https?:\/\/[^\s<>"']+)/g;

    return escapeHtml(text).replace(urlReg, url => {
        const href = url.replace(/&amp;/g, '&');
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

function renderList(items) {
    if (!items.length) {
        return '<li class="empty">暂无保存内容</li>';
    }

    return items.map((text, index) => `<li><span class="index">${index + 1}</span><p>${linkify(text)}</p><button class="copy-button" type="button" data-index="${index}">复制</button><button class="delete-button" type="button" data-index="${index}">删除</button></li>`).join('');
}

function normalizeStorage(storage) {
    if (Object.values(StorageType).includes(storage)) {
        return storage;
    }

    throw new Error(`storage must be ${StorageType.MEMORY} or ${StorageType.FILE}`);
}

function trimTexts() {
    if (texts.length > maxTextsLength) {
        texts.length = maxTextsLength;
    }
}

function loadTexts(storage) {
    if (storage !== StorageType.FILE || !fs.existsSync(fileStoragePath)) {
        return;
    }

    let data;
    try {
        data = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8') || '[]');
    } catch {
        return;
    }

    if (!Array.isArray(data)) {
        return;
    }

    texts.splice(0, texts.length, ...data.filter(item => typeof item === 'string'));
    trimTexts();
}

function saveTexts(storage) {
    if (storage !== StorageType.FILE) {
        return;
    }

    fs.writeFileSync(fileStoragePath, JSON.stringify(texts, null, 2));
}

function renderPage() {
    return pageTemplate.replace('<!-- textListReplaceSymbol -->', () => renderList(texts));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();

            if (Buffer.byteLength(body) > textMaxBytes) {
                reject(new Error('Request body too large'));
                req.destroy();
            }
        });

        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(JSON.stringify(data));
}

function sendHtml(res, html) {
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
    });
    res.end(html);
}

function main(options = {}) {
    const port = options.port || 3000;
    const storage = normalizeStorage(options.storage || StorageType.MEMORY);
    loadTexts(storage);

    const server = http.createServer(async (req, res) => {
        const currentUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (req.method === 'GET' && currentUrl.pathname === '/') {
            sendHtml(res, renderPage());
            return;
        }

        if (req.method === 'GET' && currentUrl.pathname === '/texts') {
            sendJson(res, 200, { texts });
            return;
        }

        if (req.method === 'POST' && currentUrl.pathname === '/save') {
            try {
                const body = await readBody(req);
                const data = JSON.parse(body || '{}');
                const text = typeof data.text === 'string' ? data.text.trim() : '';

                if (!text) {
                    sendJson(res, 400, { message: 'text is required' });
                    return;
                }

                texts.unshift(text);
                trimTexts();
                saveTexts(storage);
                sendJson(res, 200, { texts });
            } catch (error) {
                sendJson(res, 400, { message: error.message });
            }

            return;
        }

        if (req.method === 'POST' && currentUrl.pathname === '/delete') {
            try {
                const body = await readBody(req);
                const data = JSON.parse(body || '{}');
                const index = Number(data.index);

                if (!Number.isInteger(index) || index < 0 || index >= texts.length) {
                    sendJson(res, 400, { message: 'valid index is required' });
                    return;
                }

                texts.splice(index, 1);
                saveTexts(storage);
                sendJson(res, 200, { texts });
            } catch (error) {
                sendJson(res, 400, { message: error.message });
            }

            return;
        }

        res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end('Not Found');
    });

    server.listen(port, () => {
        console.log(`Text 服务已启动，监听端口: ${port}`);
        console.log(`存储方式: ${storage}`);
        if (storage === StorageType.FILE) {
            console.log(`存储文件: ${fileStoragePath}`);
        }
        console.log(`访问地址: http://localhost:${port}`);
        getIps().forEach(ip => {
            console.log(`访问地址: http://${ip}:${port}`);
        });
    });

    return server;
}

module.exports = main;
