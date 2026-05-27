const http = require('http');
const { getIps } = require('../utils');

const texts = [];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function linkify(text) {
    const urlReg = /(https?:\/\/[^\s<>"']+)/g;

    return escapeHtml(text).replace(urlReg, (url) => {
        const href = url.replace(/&amp;/g, '&');
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

function renderList(items) {
    if (!items.length) {
        return '<li class="empty">暂无保存内容</li>';
    }

    return items
        .map((text, index) => `<li><span class="index">${index + 1}</span><p>${linkify(text)}</p><button class="copy-button" type="button" data-index="${index}">复制</button><button class="delete-button" type="button" data-index="${index}">删除</button></li>`)
        .join('');
}

function renderPage() {
    return `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Text</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #f6f7f9;
            color: #202124;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        main {
            width: min(760px, calc(100vw - 32px));
            margin: 32px auto;
        }

        textarea {
            display: block;
            width: 100%;
            min-height: 180px;
            padding: 14px;
            border: 1px solid #d0d5dd;
            border-radius: 8px;
            resize: vertical;
            font: inherit;
            line-height: 1.5;
            background: #fff;
        }

        button {
            margin-top: 12px;
            padding: 10px 18px;
            border: 0;
            border-radius: 8px;
            background: #1769e0;
            color: #fff;
            font: inherit;
            cursor: pointer;
        }

        .save-button {
            width: 100%;
        }

        button:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }

        ul {
            margin: 24px 0 0;
            padding: 0;
            list-style: none;
        }

        li {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-top: 12px;
            padding: 14px;
            border: 1px solid #e4e7ec;
            border-radius: 8px;
            background: #fff;
        }

        li.empty {
            display: block;
            color: #667085;
        }

        .index {
            flex: 0 0 auto;
            min-width: 24px;
            color: #667085;
            line-height: 1.5;
        }

        p {
            flex: 1 1 auto;
            margin: 0;
            line-height: 1.55;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }

        .copy-button,
        .delete-button {
            flex: 0 0 auto;
            margin-top: 0;
            padding: 6px 12px;
        }

        .copy-button {
            background: #1769e0;
        }

        .delete-button {
            background: #d92d20;
        }

        a {
            color: #1769e0;
        }
    </style>
</head>
<body>
    <main>
        <textarea id="text" placeholder="输入文本"></textarea>
        <button id="save" class="save-button" type="button">保存</button>
        <ul id="list">${renderList(texts)}</ul>
    </main>

    <script>
        const textarea = document.getElementById('text');
        const saveButton = document.getElementById('save');
        const list = document.getElementById('list');

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function linkify(text) {
            const urlReg = /(https?:\\/\\/[^\\s<>"']+)/g;

            return escapeHtml(text).replace(urlReg, (url) => {
                const href = url.replace(/&amp;/g, '&');
                return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
            });
        }

        function renderList(items) {
            if (!items.length) {
                list.innerHTML = '<li class="empty">暂无保存内容</li>';
                return;
            }

            list.innerHTML = items
                .map((text, index) => '<li><span class="index">' + (index + 1) + '</span><p>' + linkify(text) + '</p><button class="copy-button" type="button" data-index="' + index + '">复制</button><button class="delete-button" type="button" data-index="' + index + '">删除</button></li>')
                .join('');
        }

        saveButton.addEventListener('click', async () => {
            const text = textarea.value.trim();

            if (!text) {
                textarea.focus();
                return;
            }

            saveButton.disabled = true;

            try {
                const response = await fetch('/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text })
                });

                if (!response.ok) {
                    throw new Error('保存失败');
                }

                const data = await response.json();
                textarea.value = '';
                renderList(data.texts);
            } finally {
                saveButton.disabled = false;
            }
        });

        list.addEventListener('click', async (event) => {
            const copyButton = event.target.closest('.copy-button');

            if (copyButton) {
                const text = copyButton.closest('li').querySelector('p').innerText;

                await navigator.clipboard.writeText(text);
                copyButton.textContent = '已复制';

                setTimeout(() => {
                    copyButton.textContent = '复制';
                }, 1200);

                return;
            }

            const button = event.target.closest('.delete-button');

            if (!button) {
                return;
            }

            button.disabled = true;

            try {
                const response = await fetch('/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        index: Number(button.dataset.index)
                    })
                });

                if (!response.ok) {
                    throw new Error('删除失败');
                }

                const data = await response.json();
                renderList(data.texts);
            } finally {
                button.disabled = false;
            }
        });
    </script>
</body>
</html>`;
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();

            if (body.length > 10 * 1024 * 1024) {
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

function main(port = 3000) {
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

                if (texts.length >= 200) {
                    texts.pop();
                }
                texts.unshift(text);
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
        console.log(`访问地址: http://localhost:${port}`);
        getIps().forEach(ip => {
            console.log(`访问地址: http://${ip}:${port}`);
        });
    });
}

module.exports = main;
