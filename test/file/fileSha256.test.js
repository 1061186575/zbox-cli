const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fileSha256 } = require('../../src/file/sha256');

describe('fileSha256', () => {
    let testDir;

    beforeEach(async () => {
        testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'zbox-file-sha256-'));
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await fs.promises.rm(testDir, { recursive: true, force: true });
    });

    test('should calculate the SHA-256 hash of a file', async () => {
        const filePath = path.join(testDir, 'test.txt');
        const content = 'Hello SHA-256';
        await fs.promises.writeFile(filePath, content);

        const result = await fileSha256(filePath);
        const expected = crypto.createHash('sha256').update(content).digest('hex');

        expect(result).toBe(expected);
        expect(console.log).toHaveBeenCalledWith(`test.txt ✅ SHA-256: ${expected}`);
    });

    test('should calculate the SHA-256 hash of an empty file', async () => {
        const filePath = path.join(testDir, 'empty.txt');
        await fs.promises.writeFile(filePath, '');

        await expect(fileSha256(filePath)).resolves.toBe(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
    });

    test('should reject a non-existent file', async () => {
        const filePath = path.join(testDir, 'missing.txt');

        await expect(fileSha256(filePath)).rejects.toThrow('文件不存在');
    });

    test('should reject a directory', async () => {
        await expect(fileSha256(testDir)).rejects.toThrow('路径不是一个文件');
    });

    test('should calculate multiple SHA-256 hashes concurrently', async () => {
        const firstFile = path.join(testDir, 'first.txt');
        const secondFile = path.join(testDir, 'second.txt');
        await fs.promises.writeFile(firstFile, 'First file');
        await fs.promises.writeFile(secondFile, 'Second file');

        const result = await fileSha256([firstFile, secondFile]);

        expect(result).toEqual([
            crypto.createHash('sha256').update('First file').digest('hex'),
            crypto.createHash('sha256').update('Second file').digest('hex')
        ]);
    });
});
