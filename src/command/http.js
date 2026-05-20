const http = require('http');
const { getIps } = require("../utils");

function main(port = 80, response) {

    const server = http.createServer((req, res) => {
        // 设置响应头
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // 处理预检请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // 响应不同状态码
        if (req.url.startsWith('/timeout')) {
            return;
        } else if (req.url.startsWith('/404')) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        } else if (req.url.startsWith('/400')) {
            res.writeHead(400);
            res.end('Bad Request');
            return;
        } else if (req.url.startsWith('/500')) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
        }

        const sendResponse = (content) => {
            res.writeHead(200);
            try {
                res.end(JSON.stringify(JSON.parse(content), null, 2));
            } catch (e) {
                res.end(content);
            }
        };

        // 获取请求头
        const headers = req.headers;

        if (req.method === 'GET') {
            const currentUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const queryResponse = currentUrl.searchParams.get('response');

            // 请求参数中的 response 优先于启动参数 response
            if (queryResponse || response) {
                sendResponse(queryResponse || response);
                return;
            }

            const response = {
                method: 'GET',
                url: req.url,
                headers: headers,
                queryParams: req.query
            };

            res.writeHead(200);
            res.end(JSON.stringify(response, null, 2));

        } else if (req.method === 'POST') {
            // POST 请求：返回请求头 + 请求体
            let body = '';

            req.on('data', (chunk) => {
                body += chunk.toString();
            });

            req.on('end', () => {
                let parsedBody;
                try {
                    // 尝试解析 JSON
                    parsedBody = JSON.parse(body);
                } catch (e) {
                    // 如果不是 JSON，就保持原始字符串
                    parsedBody = body;
                }

                // 请求参数中的 response 优先于启动参数 response
                if (
                    parsedBody &&
                    typeof parsedBody === 'object' &&
                    !Array.isArray(parsedBody) &&
                    parsedBody.response
                ) {
                    sendResponse(String(parsedBody.response));
                    return;
                }

                // 响应指定内容
                if (response) {
                    sendResponse(response);
                    return;
                }

                const response = {
                    method: 'POST',
                    url: req.url,
                    headers: headers,
                    body: parsedBody
                };

                res.writeHead(200);
                res.end(JSON.stringify(response, null, 2));
            });

        } else {
            // 其他请求方法
            const response = {
                method: req.method,
                url: req.url,
                headers: headers,
                message: `Method ${req.method} not specifically handled, but request received`
            };

            res.writeHead(200);
            res.end(JSON.stringify(response, null, 2));
        }
    });

    server.listen(port, () => {
        console.log(`HTTP 服务已启动，监听端口: ${port}`);
        console.log(`访问地址: http://localhost:${port}`);
        getIps().forEach(ip => {
            console.log(`访问地址: http://${ip}:${port}`);
        })
    });

}

module.exports = main;
