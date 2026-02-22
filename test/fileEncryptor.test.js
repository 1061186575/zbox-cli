const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { encryptCLI, decryptCLI, isEncryptedFile } = require('../src/file/fileEncryptor');

// 测试用的临时目录
const testDir = path.join(os.tmpdir(), 'fileEncryptor-test');
const testKey = 'test-encryption-key-123';


describe('FileEncryptor', () => {
    beforeAll(async () => {
        // 创建测试目录
        await fs.promises.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
        // 清理测试目录
        try {
            await fs.promises.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // 忽略清理错误
        }
    });

    beforeEach(() => {
        // Mock console.log 和 console.warn
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        // 恢复 console
        jest.restoreAllMocks();
    });

    describe('Single File Operations', () => {
        test('should encrypt and decrypt a text file successfully', async () => {
            const testContent = 'Hello, World! This is a test file.';
            const testFile = path.join(testDir, 'test.txt');
            const encryptedFile = testFile + '.encrypted';
            const decryptedFile = testFile; // 解密时会恢复原文件名

            // 创建测试文件
            await fs.promises.writeFile(testFile, testContent, 'utf8');

            // 加密文件
            await encryptCLI(testFile, testKey);
            expect(fs.existsSync(encryptedFile)).toBe(true);

            // 验证加密文件内容与原文件不同
            const encryptedContent = await fs.promises.readFile(encryptedFile);
            expect(encryptedContent.toString()).not.toBe(testContent);

            // 删除原文件，然后解密
            await fs.promises.unlink(testFile);

            // 解密文件 (会生成 .decrypted 文件)
            await decryptCLI(encryptedFile, testKey);
            const actualDecryptedFile = encryptedFile + '.decrypted';
            const decryptedContent = await fs.promises.readFile(actualDecryptedFile, 'utf8');
            expect(decryptedContent).toBe(testContent);

            // 清理
            await fs.promises.unlink(actualDecryptedFile);
            await fs.promises.unlink(encryptedFile);
        });

        test('should handle binary files correctly', async () => {
            const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
            const testFile = path.join(testDir, 'binary.dat');
            const encryptedFile = testFile + '.encrypted';

            // 创建二进制测试文件
            await fs.promises.writeFile(testFile, binaryData);

            // 加密和解密
            await encryptCLI(testFile, testKey);
            await decryptCLI(encryptedFile, testKey, { output: testFile + '.decrypted' });

            // 验证内容
            const decryptedData = await fs.promises.readFile(testFile + '.decrypted');
            expect(Buffer.compare(binaryData, decryptedData)).toBe(0);

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(encryptedFile);
            await fs.promises.unlink(testFile + '.decrypted');
        });

        test('should handle empty files', async () => {
            const testFile = path.join(testDir, 'empty.txt');
            const encryptedFile = testFile + '.encrypted';

            // 创建空文件
            await fs.promises.writeFile(testFile, '');

            // 加密
            await encryptCLI(testFile, testKey);

            // 删除原文件，然后解密
            await fs.promises.unlink(testFile);
            await decryptCLI(encryptedFile, testKey);

            // 验证解密后的文件也是空的 (会生成 .decrypted 文件)
            const actualDecryptedFile = encryptedFile + '.decrypted';
            const decryptedContent = await fs.promises.readFile(actualDecryptedFile);
            expect(decryptedContent.length).toBe(0);

            // 清理
            await fs.promises.unlink(actualDecryptedFile);
            await fs.promises.unlink(encryptedFile);
        });

        test('should handle large files', async () => {
            const largeContent = 'A'.repeat(10000); // 10KB 文件
            const testFile = path.join(testDir, 'large.txt');
            const encryptedFile = testFile + '.encrypted';

            // 创建大文件
            await fs.promises.writeFile(testFile, largeContent);

            // 加密
            await encryptCLI(testFile, testKey);

            // 删除原文件，然后解密
            await fs.promises.unlink(testFile);
            await decryptCLI(encryptedFile, testKey);

            // 验证内容 (会生成 .decrypted 文件)
            const actualDecryptedFile = encryptedFile + '.decrypted';
            const decryptedContent = await fs.promises.readFile(actualDecryptedFile, 'utf8');
            expect(decryptedContent).toBe(largeContent);

            // 清理
            await fs.promises.unlink(actualDecryptedFile);
            await fs.promises.unlink(encryptedFile);
        });
    });

    describe('Custom Output Paths', () => {
        test('should respect custom output path for encryption', async () => {
            const testContent = 'Custom output test';
            const testFile = path.join(testDir, 'input.txt');
            const customOutput = path.join(testDir, 'custom-encrypted.dat');

            await fs.promises.writeFile(testFile, testContent);

            // 使用自定义输出路径加密
            await encryptCLI(testFile, testKey, { output: customOutput });

            expect(fs.existsSync(customOutput)).toBe(true);
            expect(fs.existsSync(testFile + '.encrypted')).toBe(false);

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(customOutput);
        });

        test('should respect custom extension', async () => {
            const testContent = 'Custom extension test';
            const testFile = path.join(testDir, 'test.txt');
            const customExtension = '.secret';

            await fs.promises.writeFile(testFile, testContent);

            // 使用自定义扩展名
            await encryptCLI(testFile, testKey, { extension: customExtension });

            const expectedOutput = testFile + customExtension;
            expect(fs.existsSync(expectedOutput)).toBe(true);

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(expectedOutput);
        });
    });

    describe('Directory Operations', () => {
        test('should encrypt and decrypt a directory recursively', async () => {
            const sourceDir = path.join(testDir, 'source');
            const encryptedDir = sourceDir + '.encrypted';

            // 创建测试目录结构
            await fs.promises.mkdir(sourceDir, { recursive: true });
            await fs.promises.mkdir(path.join(sourceDir, 'subdir'), { recursive: true });

            await fs.promises.writeFile(path.join(sourceDir, 'file1.txt'), 'Content 1');
            await fs.promises.writeFile(path.join(sourceDir, 'file2.txt'), 'Content 2');
            await fs.promises.writeFile(path.join(sourceDir, 'subdir', 'file3.txt'), 'Content 3');

            // 加密目录
            await encryptCLI(sourceDir, testKey);
            expect(fs.existsSync(encryptedDir)).toBe(true);
            expect(fs.existsSync(path.join(encryptedDir, 'file1.txt.encrypted'))).toBe(true);
            expect(fs.existsSync(path.join(encryptedDir, 'subdir', 'file3.txt.encrypted'))).toBe(true);

            // 解密目录 (根据 getOutputPath 逻辑，加密目录解密时会恢复原目录名)
            await decryptCLI(encryptedDir, testKey);

            // 验证解密后的内容 (应该恢复到原目录结构)
            const content1 = await fs.promises.readFile(path.join(sourceDir, 'file1.txt'), 'utf8');
            const content3 = await fs.promises.readFile(path.join(sourceDir, 'subdir', 'file3.txt'), 'utf8');
            expect(content1).toBe('Content 1');
            expect(content3).toBe('Content 3');

            // 清理
            await fs.promises.rm(sourceDir, { recursive: true, force: true });
            await fs.promises.rm(encryptedDir, { recursive: true, force: true });
        });

        test('should handle non-recursive directory processing', async () => {
            const sourceDir = path.join(testDir, 'nonrecursive');
            const encryptedDir = sourceDir + '.encrypted';

            // 创建测试目录结构
            await fs.promises.mkdir(sourceDir, { recursive: true });
            await fs.promises.mkdir(path.join(sourceDir, 'subdir'), { recursive: true });

            await fs.promises.writeFile(path.join(sourceDir, 'file1.txt'), 'Content 1');
            await fs.promises.writeFile(path.join(sourceDir, 'subdir', 'file2.txt'), 'Content 2');

            // 非递归加密
            await encryptCLI(sourceDir, testKey, { recursive: false });

            expect(fs.existsSync(path.join(encryptedDir, 'file1.txt.encrypted'))).toBe(true);
            expect(fs.existsSync(path.join(encryptedDir, 'subdir'))).toBe(true);
            expect(fs.existsSync(path.join(encryptedDir, 'subdir', 'file2.txt.encrypted'))).toBe(false);

            // 清理
            await fs.promises.rm(sourceDir, { recursive: true, force: true });
            await fs.promises.rm(encryptedDir, { recursive: true, force: true });
        });
    });

    describe('Overwrite Protection', () => {
        test('should prevent overwriting existing files by default', async () => {
            const testFile = path.join(testDir, 'overwrite-test.txt');
            const encryptedFile = testFile + '.encrypted';

            await fs.promises.writeFile(testFile, 'Original content');
            await fs.promises.writeFile(encryptedFile, 'Existing encrypted file');

            // 应该抛出错误，因为输出文件已存在
            await expect(encryptCLI(testFile, testKey)).rejects.toThrow('输出文件已存在');

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(encryptedFile);
        });

        test('should allow overwriting with overwrite flag', async () => {
            const testFile = path.join(testDir, 'overwrite-allowed.txt');
            const encryptedFile = testFile + '.encrypted';

            await fs.promises.writeFile(testFile, 'New content');
            await fs.promises.writeFile(encryptedFile, 'Old encrypted content');

            // 使用 overwrite 参数应该成功
            await expect(encryptCLI(testFile, testKey, { overwrite: true })).resolves.not.toThrow();

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(encryptedFile);
        });
    });

    describe('Different Keys', () => {
        test('should fail to decrypt with wrong key', async () => {
            const testContent = 'Secret message';
            const testFile = path.join(testDir, 'secret.txt');
            const encryptedFile = testFile + '.encrypted';

            await fs.promises.writeFile(testFile, testContent);

            // 用一个密钥加密
            await encryptCLI(testFile, 'correct-key');

            // 用不同的密钥解密应该失败
            await expect(decryptCLI(encryptedFile, 'wrong-key')).rejects.toThrow('解密失败');

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(encryptedFile);
        });

    });

    describe('isEncryptedFile Function', () => {
        test('should correctly identify encrypted files', async () => {
            const testFile = path.join(testDir, 'identify-test.txt');
            const encryptedFile = testFile + '.encrypted';

            await fs.promises.writeFile(testFile, 'Test content for identification');
            await encryptCLI(testFile, testKey);

            expect(isEncryptedFile(encryptedFile)).toBe(true);
            expect(isEncryptedFile(testFile)).toBe(false);

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(encryptedFile);
        });

        test('should return false for non-existent files', () => {
            expect(isEncryptedFile('/path/to/nonexistent/file.txt')).toBe(false);
        });

        test('should return false for directories', async () => {
            const testDir2 = path.join(testDir, 'not-a-file');
            await fs.promises.mkdir(testDir2, { recursive: true });

            expect(isEncryptedFile(testDir2)).toBe(false);

            await fs.promises.rmdir(testDir2);
        });

        test('should return false for files that are too small', async () => {
            const smallFile = path.join(testDir, 'too-small.txt');
            await fs.promises.writeFile(smallFile, 'tiny');

            expect(isEncryptedFile(smallFile)).toBe(false);

            await fs.promises.unlink(smallFile);
        });

        test('should return false for files with invalid format', async () => {
            const invalidFile = path.join(testDir, 'invalid-format.txt');
            const invalidData = Buffer.alloc(200); // 200字节的零数据
            invalidData[0] = 32; // 错误的盐长度

            await fs.promises.writeFile(invalidFile, invalidData);

            expect(isEncryptedFile(invalidFile)).toBe(false);

            await fs.promises.unlink(invalidFile);
        });
    });

    describe('Error Handling', () => {
        test('should handle non-existent input files', async () => {
            const nonExistentFile = path.join(testDir, 'does-not-exist.txt');

            await expect(encryptCLI(nonExistentFile, testKey)).rejects.toThrow();
        });

        test('should handle invalid operations', async () => {
            // 这个测试需要直接测试内部实现，因为 CLI 函数不直接暴露无效操作
            // 我们可以通过尝试解密一个非加密文件来测试错误处理

            const testFile = path.join(testDir, 'not-encrypted.txt');
            await fs.promises.writeFile(testFile, 'This is not an encrypted file');

            await expect(decryptCLI(testFile, testKey)).rejects.toThrow();

            await fs.promises.unlink(testFile);
        });

        test('should handle permission errors gracefully', async () => {
            // 在 Windows 上跳过这个测试，因为权限模型不同
            if (process.platform === 'win32') {
                return;
            }

            const testFile = path.join(testDir, 'permission-test.txt');
            const restrictedDir = path.join(testDir, 'restricted');

            await fs.promises.writeFile(testFile, 'Test content');
            await fs.promises.mkdir(restrictedDir, { recursive: true });

            // 移除目录的写权限
            await fs.promises.chmod(restrictedDir, 0o444);

            try {
                const outputInRestricted = path.join(restrictedDir, 'output.encrypted');
                await expect(encryptCLI(testFile, testKey, { output: outputInRestricted })).rejects.toThrow();
            } finally {
                // 恢复权限以便清理
                await fs.promises.chmod(restrictedDir, 0o755);
                await fs.promises.unlink(testFile);
                await fs.promises.rmdir(restrictedDir);
            }
        });
    });

    describe('Path Handling', () => {
        test('should handle paths with spaces and special characters', async () => {
            const specialDir = path.join(testDir, 'special dir with spaces & symbols!');
            const testFile = path.join(specialDir, 'test file.txt');

            await fs.promises.mkdir(specialDir, { recursive: true });
            await fs.promises.writeFile(testFile, 'Special path content');

            await encryptCLI(testFile, testKey);

            const encryptedFile = testFile + '.encrypted';
            expect(fs.existsSync(encryptedFile)).toBe(true);

            // 清理
            await fs.promises.rm(specialDir, { recursive: true, force: true });
        });

        test('should handle relative paths correctly', async () => {
            const currentDir = process.cwd();
            process.chdir(testDir);

            try {
                await fs.promises.writeFile('relative-test.txt', 'Relative path test');
                await encryptCLI('./relative-test.txt', testKey);

                expect(fs.existsSync('./relative-test.txt.encrypted')).toBe(true);

                // 清理
                await fs.promises.unlink('./relative-test.txt');
                await fs.promises.unlink('./relative-test.txt.encrypted');
            } finally {
                process.chdir(currentDir);
            }
        });
    });

    describe('Extension Handling', () => {
        test('should properly handle decrypt extension logic', async () => {
            const testFile = path.join(testDir, 'extension-test.txt');
            await fs.promises.writeFile(testFile, 'Extension test content');

            // 加密文件
            await encryptCLI(testFile, testKey);
            const encryptedFile = testFile + '.encrypted';

            // 不指定扩展名解密，应该移除 .encrypted 后缀
            await decryptCLI(encryptedFile, testKey);
            expect(fs.existsSync(testFile + '.decrypted')).toBe(false); // 应该直接还原原文件名
            expect(fs.existsSync(testFile)).toBe(true);

            // 验证内容
            const content = await fs.promises.readFile(testFile, 'utf8');
            expect(content).toBe('Extension test content');

            // 清理
            await fs.promises.unlink(testFile);
            await fs.promises.unlink(encryptedFile);
        });
    });
});
