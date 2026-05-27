const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const testStoragePath = path.join(os.tmpdir(), 'zbox-network-text-test.json');
const originalEnv = process.env.ZBOX_TEXT_STORAGE_PATH;

// Mock getIps
jest.mock('../../src/utils', () => ({
    getIps: () => ['192.168.1.1']
}));

describe('Text Service', () => {
    let createServer;
    let server;
    let consoleLogSpy;

    beforeAll(() => {
        process.env.ZBOX_TEXT_STORAGE_PATH = testStoragePath;
        // Load module once
        createServer = require('../../src/net/text');
    });

    afterAll(() => {
        process.env.ZBOX_TEXT_STORAGE_PATH = originalEnv;
        // Clean up test storage file
        if (fs.existsSync(testStoragePath)) {
            fs.unlinkSync(testStoragePath);
        }
    });

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
            server = null;
        }
        consoleLogSpy.mockRestore();
        // Clean up storage file between tests
        if (fs.existsSync(testStoragePath)) {
            fs.unlinkSync(testStoragePath);
        }
    });

    function getPort(srv) {
        return srv.address().port;
    }

    async function request(port, options, body) {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port,
                ...options
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            req.on('error', reject);
            if (body) {
                req.write(body);
            }
            req.end();
        });
    }

    async function createServerAsync(options = {}) {
        return new Promise((resolve) => {
            // Always reset texts array for clean test state
            const srv = createServer({ port: 0, reset: true, ...options });
            srv.on('listening', () => resolve(srv));
        });
    }

    describe('Memory Storage', () => {
        test('should start server with default port', async () => {
            server = await createServerAsync();
            expect(server).toBeDefined();
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('should start server with custom port', async () => {
            server = await createServerAsync();
            expect(server).toBeDefined();
        });

        test('should return HTML page for GET /', async () => {
            server = await createServerAsync();
            const port = getPort(server);

            const res = await request(port, {
                method: 'GET',
                path: '/'
            });

            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/html');
            expect(res.body).toContain('暂无保存内容');
        });

        // test('should return empty texts array for GET /texts', async () => {
        //     server = await createServerAsync();
        //     const port = getPort(server);
        //
        //     const res = await request(port, {
        //         method: 'GET',
        //         path: '/texts'
        //     });
        //
        //     expect(res.statusCode).toBe(200);
        //     expect(res.headers['content-type']).toContain('application/json');
        //     expect(JSON.parse(res.body)).toEqual({ texts: [] });
        // });

    });

    describe('File Storage', () => {
        test('should load texts from file on startup', async () => {
            // Create storage file with existing data
            fs.writeFileSync(testStoragePath, JSON.stringify(['existing text']));

            server = await createServerAsync({ storage: 'file', port: 1234 });
            const port = getPort(server);

            const res = await request(port, {
                method: 'GET',
                path: '/texts'
            });

            expect(JSON.parse(res.body).texts).toEqual(['existing text']);
        });
    });

    describe('Storage Validation', () => {
        test('should throw error for invalid storage type', () => {
            expect(() => createServer({ storage: 'invalid' })).toThrow(
                'storage must be memory or file'
            );
        });

        test('should accept memory storage', async () => {
            server = await createServerAsync({ storage: 'memory' });
            expect(server).toBeDefined();
        });
    });

    describe('HTML Rendering', () => {
        test('should escape HTML in texts', async () => {
            server = await createServerAsync();
            const port = getPort(server);

            await request(port, {
                method: 'POST',
                path: '/save',
                headers: { 'Content-Type': 'application/json' }
            }, JSON.stringify({ text: '<script>alert("xss")</script>' }));

            const res = await request(port, {
                method: 'GET',
                path: '/'
            });

            expect(res.body).toContain('&lt;script&gt;');
            expect(res.body).not.toContain('<script>alert');
        });

    });
});
