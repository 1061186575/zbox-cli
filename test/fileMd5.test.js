const fs = require('fs');
const path = require('path');
const fileMd5 = require('../src/file/md5');

// Mock console.log to capture output
const originalLog = console.log;
const originalError = console.error;
let logOutput = [];

beforeEach(() => {
    logOutput = [];
    console.log = (...args) => {
        logOutput.push(args.join(' '));
    };
    console.error = (...args) => {
        logOutput.push(args.join(' '));
    };
});

afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
});

describe('fileMd5', () => {
    const testDir = path.join(__dirname, 'tmp');
    const testFile = path.join(testDir, 'test-md5.txt');
    const testContent = 'Hello, World!测试内容';

    beforeAll(() => {
        // 创建测试目录
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        // 创建测试文件
        fs.writeFileSync(testFile, testContent);
    });

    afterAll(() => {
        // 清理测试文件
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    });

    test('应该能计算存在文件的 MD5 值', async () => {
        // Mock question function
        const mockQuestion = jest.fn();
        jest.doMock('../src/utils', () => ({
            question: mockQuestion
        }));

        const result = await fileMd5(testFile);

        expect(result).toBe('8268a33584ba20b63d65a331507a888d');

        // 验证输出包含正确信息
        const output = logOutput.join('\n');
        expect(output).toContain('正在计算文件 MD5');
        expect(output).toContain('✅ MD5:');
        expect(output).toContain(result);
    });

    test('应该正确处理文件不存在的情况', async () => {
        const nonExistentFile = path.join(testDir, 'non-existent.txt');

        await expect(async () => {
            await fileMd5(nonExistentFile);
        }).rejects.toThrow();

        const errorOutput = logOutput.join('\n');
        expect(errorOutput).toContain('文件不存在');
    });

    test('应该正确处理目录而不是文件的情况', async () => {
        await expect(async () => {
            await fileMd5(testDir);
        }).rejects.toThrow();

        const errorOutput = logOutput.join('\n');
        expect(errorOutput).toContain('路径不是一个文件');
    });

    test('对于同样的文件内容应该产生相同的 MD5 值', async () => {
        const testFile2 = path.join(testDir, 'test-md5-2.txt');
        fs.writeFileSync(testFile2, testContent);

        const md5_1 = await fileMd5(testFile);
        // 清空日志
        logOutput = [];
        const md5_2 = await fileMd5(testFile2);

        expect(md5_1).toBe(md5_2);

        // 清理
        fs.unlinkSync(testFile2);
    });

    test('应该能处理空文件', async () => {
        const emptyFile = path.join(testDir, 'empty.txt');
        fs.writeFileSync(emptyFile, '');

        const result = await fileMd5(emptyFile);

        // 空文件的 MD5 应该是已知的固定值
        expect(result).toBe('d41d8cd98f00b204e9800998ecf8427e');

        // 清理
        fs.unlinkSync(emptyFile);
    });
});
