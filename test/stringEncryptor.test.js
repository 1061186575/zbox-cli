const { StringEncryptor, encryptStringCLI, decryptStringCLI, isValidEncryptedString } = require('../src/command/stringEncryptor');

describe('StringEncryptor', () => {
    const testKey = 'test-encryption-key-123';
    let encryptor;

    beforeEach(() => {
        encryptor = new StringEncryptor(testKey);
        // Mock console.log 和 console.error
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // 恢复 console
        jest.restoreAllMocks();
    });

    describe('StringEncryptor Class', () => {
        test('should create encryptor with valid key', () => {
            expect(encryptor).toBeInstanceOf(StringEncryptor);
            expect(encryptor.key).toHaveLength(32); // SHA256 产生32字节密钥
            expect(encryptor.algorithm).toBe('aes-256-gcm');
        });

        test('should handle different key types', () => {
            const encryptors = [
                new StringEncryptor('string-key'),
                new StringEncryptor(12345),
                new StringEncryptor(Buffer.from('buffer-key')),
                new StringEncryptor(null),
                new StringEncryptor(undefined)
            ];

            encryptors.forEach(enc => {
                expect(enc.key).toHaveLength(32);
            });
        });
    });

    describe('Basic Encryption and Decryption', () => {
        test('should encrypt and decrypt simple string successfully', () => {
            const plaintext = 'Hello, World!';

            const encrypted = encryptor.encrypt(plaintext);
            const decrypted = encryptor.decrypt(encrypted);

            expect(typeof encrypted).toBe('string');
            expect(encrypted).not.toBe(plaintext);
            expect(decrypted).toBe(plaintext);
        });

        test('should encrypt and decrypt single character', () => {
            const plaintext = 'x';

            const encrypted = encryptor.encrypt(plaintext);
            const decrypted = encryptor.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should encrypt and decrypt Unicode characters', () => {
            const plaintext = 'Hello 世界! 🔒 测试 Unicode 字符 👍';

            const encrypted = encryptor.encrypt(plaintext);
            const decrypted = encryptor.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should encrypt and decrypt long strings', () => {
            const plaintext = 'A'.repeat(10000) + '中文字符'.repeat(1000);

            const encrypted = encryptor.encrypt(plaintext);
            const decrypted = encryptor.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should encrypt and decrypt strings with special characters', () => {
            const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\n\\t\\r';

            const encrypted = encryptor.encrypt(plaintext);
            const decrypted = encryptor.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should encrypt and decrypt multiline strings', () => {
            const plaintext = `Line 1
Line 2 with 中文
Line 3 with emojis 🎉
Final line`;

            const encrypted = encryptor.encrypt(plaintext);
            const decrypted = encryptor.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        test('should encrypt and decrypt JSON strings', () => {
            const jsonObject = {
                name: '张三',
                age: 25,
                hobbies: ['reading', '编程', '🎮'],
                nested: {
                    key: 'value',
                    unicode: '测试'
                }
            };
            const plaintext = JSON.stringify(jsonObject, null, 2);

            const encrypted = encryptor.encrypt(plaintext);
            const decrypted = encryptor.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
            expect(JSON.parse(decrypted)).toEqual(jsonObject);
        });
    });

    describe('Encryption Properties', () => {
        test('should generate different ciphertext for same plaintext', () => {
            const plaintext = 'Same input text';

            const encrypted1 = encryptor.encrypt(plaintext);
            const encrypted2 = encryptor.encrypt(plaintext);

            expect(encrypted1).not.toBe(encrypted2); // 随机IV确保不同

            const decrypted1 = encryptor.decrypt(encrypted1);
            const decrypted2 = encryptor.decrypt(encrypted2);

            expect(decrypted1).toBe(plaintext);
            expect(decrypted2).toBe(plaintext);
        });

        test('should produce base64-encoded output', () => {
            const plaintext = 'Base64 test';
            const encrypted = encryptor.encrypt(plaintext);

            // Base64 字符集检查
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            expect(base64Regex.test(encrypted)).toBe(true);

            // 应该能解码为Buffer
            expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
        });

        test('should have proper encrypted data structure', () => {
            const plaintext = 'Structure test';
            const encrypted = encryptor.encrypt(plaintext);
            const data = Buffer.from(encrypted, 'base64');

            // 验证长度：盐(32) + IV(16) + 标签(16) + 至少加密数据(>=1)
            expect(data.length).toBeGreaterThanOrEqual(65);

            // 验证能正常解密
            const decrypted = encryptor.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('Different Keys', () => {
        test('should fail to decrypt with wrong key', () => {
            const plaintext = 'Secret message';
            const wrongKey = 'wrong-key';

            const encrypted = encryptor.encrypt(plaintext);
            const wrongEncryptor = new StringEncryptor(wrongKey);

            expect(() => wrongEncryptor.decrypt(encrypted)).toThrow('解密失败');
        });

        test('should work with different key formats', () => {
            const plaintext = 'Key format test';
            const keys = [
                'string-key',
                123456789,
                Buffer.from('buffer-key'),
                { toString: () => 'object-key' }
            ];

            keys.forEach(key => {
                const enc = new StringEncryptor(key);
                const encrypted = enc.encrypt(plaintext);
                const decrypted = enc.decrypt(encrypted);
                expect(decrypted).toBe(plaintext);
            });
        });

        test('should be deterministic with same key', () => {
            const plaintext = 'Deterministic key test';

            const enc1 = new StringEncryptor(testKey);
            const enc2 = new StringEncryptor(testKey);

            const encrypted1 = enc1.encrypt(plaintext);
            const decrypted2 = enc2.decrypt(encrypted1);

            expect(decrypted2).toBe(plaintext);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid base64 input', () => {
            const invalidBase64 = 'invalid-base64-string!@#';

            expect(() => encryptor.decrypt(invalidBase64)).toThrow('解密失败');
        });

        test('should handle truncated encrypted data', () => {
            const plaintext = 'Truncated test';
            const encrypted = encryptor.encrypt(plaintext);
            const truncated = encrypted.substring(0, encrypted.length - 10);

            expect(() => encryptor.decrypt(truncated)).toThrow('解密失败');
        });

        test('should handle corrupted encrypted data', () => {
            const plaintext = 'Corruption test';
            const encrypted = encryptor.encrypt(plaintext);

            // 修改密文中的一个字符
            const corrupted = encrypted.substring(0, 10) + 'X' + encrypted.substring(11);

            expect(() => encryptor.decrypt(corrupted)).toThrow('解密失败');
        });

        test('should handle completely invalid encrypted data', () => {
            const invalidInputs = [
                '',
                'a',
                'short',
                'MTIzNDU2', // base64 of "123456", too short
                Buffer.alloc(64).toString('base64') // correct length but invalid structure
            ];

            invalidInputs.forEach(input => {
                expect(() => encryptor.decrypt(input)).toThrow('解密失败');
            });
        });
    });

    describe('isValidEncryptedString Function', () => {
        test('should correctly identify valid encrypted strings', () => {
            const plaintext = 'Valid encryption test';
            const encrypted = encryptor.encrypt(plaintext);

            expect(isValidEncryptedString(encrypted)).toBe(true);
        });

        test('should reject invalid encrypted strings', () => {
            const invalidStrings = [
                '',
                'short',
                'not-base64-!@#',
                'MTIzNDU2', // too short
                Buffer.alloc(64).toString('base64') // correct length but minimal
            ];

            invalidStrings.forEach(str => {
                expect(isValidEncryptedString(str)).toBe(false);
            });
        });

        test('should handle edge cases', () => {
            // 最小有效长度检查
            const minValidLength = Math.ceil((32 + 16 + 16 + 1) * 4 / 3); // base64编码的最小长度
            const minValidData = Buffer.alloc(65); // 盐32 + IV16 + 标签16 + 数据1
            const minValidBase64 = minValidData.toString('base64');

            expect(isValidEncryptedString(minValidBase64)).toBe(true);

            // 刚好小于最小长度的应该被拒绝
            const tooShortData = Buffer.alloc(64);
            const tooShortBase64 = tooShortData.toString('base64');
            expect(isValidEncryptedString(tooShortBase64)).toBe(false);
        });
    });
});

describe('CLI Functions', () => {
    const testKey = 'cli-test-key-456';

    beforeEach(() => {
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('encryptStringCLI', () => {
        test('should encrypt string and log results', async () => {
            const plaintext = 'CLI encryption test';

            const result = await encryptStringCLI(plaintext, testKey);

            expect(typeof result).toBe('string');
            expect(result).not.toBe(plaintext);
            expect(isValidEncryptedString(result)).toBe(true);

            // 验证能解密回原文
            const encryptor = new StringEncryptor(testKey);
            const decrypted = encryptor.decrypt(result);
            expect(decrypted).toBe(plaintext);

            // 验证控制台输出
            expect(console.log).toHaveBeenCalledWith('🔒 加密完成！');
            expect(console.log).toHaveBeenCalledWith('明文:', plaintext);
            expect(console.log).toHaveBeenCalledWith('密文:', result);
        });

        test('should reject empty plaintext', async () => {
            await expect(encryptStringCLI('', testKey)).rejects.toThrow('请提供要加密的字符串');
        });

        test('should throw error for missing plaintext', async () => {
            await expect(encryptStringCLI('', testKey)).rejects.toThrow('请提供要加密的字符串');
            await expect(encryptStringCLI(null, testKey)).rejects.toThrow('请提供要加密的字符串');
            await expect(encryptStringCLI(undefined, testKey)).rejects.toThrow('请提供要加密的字符串');
        });

        test('should throw error for missing key', async () => {
            await expect(encryptStringCLI('test', '')).rejects.toThrow('请提供加密密钥');
            await expect(encryptStringCLI('test', null)).rejects.toThrow('请提供加密密钥');
            await expect(encryptStringCLI('test', undefined)).rejects.toThrow('请提供加密密钥');
        });
    });

    describe('decryptStringCLI', () => {
        test('should decrypt string and log results', async () => {
            const plaintext = 'CLI decryption test';
            const encryptor = new StringEncryptor(testKey);
            const encrypted = encryptor.encrypt(plaintext);

            const result = await decryptStringCLI(encrypted, testKey);

            expect(result).toBe(plaintext);

            // 验证控制台输出
            expect(console.log).toHaveBeenCalledWith('🔓 解密完成！');
            expect(console.log).toHaveBeenCalledWith('密文:', encrypted);
            expect(console.log).toHaveBeenCalledWith('明文:', result);
        });

        test('should throw error for missing ciphertext', async () => {
            await expect(decryptStringCLI('', testKey)).rejects.toThrow('请提供要解密的字符串');
            await expect(decryptStringCLI(null, testKey)).rejects.toThrow('请提供要解密的字符串');
            await expect(decryptStringCLI(undefined, testKey)).rejects.toThrow('请提供要解密的字符串');
        });

        test('should throw error for missing key', async () => {
            const validEncrypted = Buffer.alloc(65).toString('base64');

            await expect(decryptStringCLI(validEncrypted, '')).rejects.toThrow('请提供解密密钥');
            await expect(decryptStringCLI(validEncrypted, null)).rejects.toThrow('请提供解密密钥');
            await expect(decryptStringCLI(validEncrypted, undefined)).rejects.toThrow('请提供解密密钥');
        });

        test('should validate encrypted string format before decryption', async () => {
            const invalidInputs = [
                'invalid-base64-!@#',
                'short',
                Buffer.alloc(30).toString('base64') // too short
            ];

            for (const input of invalidInputs) {
                await expect(decryptStringCLI(input, testKey)).rejects.toThrow('无效的加密字符串格式');
            }
        });

        test('should throw error for wrong decryption key', async () => {
            const plaintext = 'Wrong key test';
            const encryptor = new StringEncryptor(testKey);
            const encrypted = encryptor.encrypt(plaintext);

            await expect(decryptStringCLI(encrypted, 'wrong-key')).rejects.toThrow('解密失败');
        });
    });

    describe('Integration Tests', () => {
        test('should handle round-trip encryption/decryption via CLI', async () => {
            const testCases = [
                'Simple text',
                'Unicode: 你好世界 🌍',
                'Multi\nline\ntext',
                JSON.stringify({ key: 'value', array: [1, 2, 3] }),
                'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
                'A'.repeat(1000) // long string
            ];

            for (const plaintext of testCases) {
                const encrypted = await encryptStringCLI(plaintext, testKey);
                const decrypted = await decryptStringCLI(encrypted, testKey);
                expect(decrypted).toBe(plaintext);
            }
        });

        test('should handle different key formats in CLI', async () => {
            const plaintext = 'Key format CLI test';
            const keys = ['string-key', '123456789'];

            for (const key of keys) {
                const encrypted = await encryptStringCLI(plaintext, key);
                const decrypted = await decryptStringCLI(encrypted, key);
                expect(decrypted).toBe(plaintext);
            }
        });
    });
});
