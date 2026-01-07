const http = require('http');
function main(port, response) {

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
        
        if (response) {
            res.writeHead(200);
            try {
                res.end(JSON.stringify(JSON.parse(response), null, 2));
            } catch (e) {
                res.end(response);
            }
            return;
        }

        // 获取请求头
        const headers = req.headers;

        if (req.method === 'GET') {
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
    });

}

module.exports = main;
