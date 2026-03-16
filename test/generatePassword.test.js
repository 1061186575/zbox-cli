const crypto = require('crypto');

// Mock utils
const mockQuestion = jest.fn();
const mockSecretQuestion = jest.fn();
jest.mock('../src/utils', () => ({
    question: mockQuestion,
    secretQuestion: mockSecretQuestion
}));

const generatePasswordCommand = require('../src/command/generatePassword');

describe('Generate Password Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn(); // Mock console.log
        console.error = jest.fn(); // Mock console.error
    });

    describe('Parameter validation', () => {
        test('should reject invalid length - not a number', async () => {
            const result = await generatePasswordCommand({
                length: 'invalid',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('❌ 参数错误：密码长度必须是数字');
        });

        test('should reject length too short', async () => {
            const result = await generatePasswordCommand({
                length: '3',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('❌ 参数错误：密码长度必须在 4-128 之间');
        });

        test('should reject length too long', async () => {
            const result = await generatePasswordCommand({
                length: '129',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('❌ 参数错误：密码长度必须在 4-128 之间');
        });

        test('should reject invalid password version - not a number', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                pwdVersion: 'invalid',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('❌ 参数错误：密码版本号必须是数字');
        });

        test('should reject password version less than 1', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                pwdVersion: '0',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('❌ 参数错误：密码版本号必须大于等于 1');
        });

        test('should reject when no character types are selected', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                uppercase: false,
                lowercase: false,
                digits: false,
                symbols: false,
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith(
                '❌ 参数错误：至少需要包含一种字符类型（大写字母、小写字母、数字、特殊字符）'
            );
        });
    });

    describe('User input handling', () => {
        test('should prompt for site when not provided', async () => {
            mockQuestion.mockResolvedValue('github.com');
            mockSecretQuestion.mockResolvedValue('masterpass123');

            const result = await generatePasswordCommand({
                length: '16'
            });

            expect(mockQuestion).toHaveBeenCalledWith('请输入网站/服务名称: ');
            expect(mockSecretQuestion).toHaveBeenCalledWith('请输入主密码 (输入时不可见): ');
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBe(16);
        });

        test('should prompt for master key when not provided', async () => {
            mockSecretQuestion.mockResolvedValue('masterpass123');

            const result = await generatePasswordCommand({
                length: '16',
                site: 'example.com'
            });

            expect(mockSecretQuestion).toHaveBeenCalledWith('请输入主密码 (输入时不可见): ');
            expect(result).toBeDefined();
        });

        test('should reject empty site name', async () => {
            mockQuestion.mockResolvedValue('  '); // whitespace only

            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('网站/服务名称不能为空');
        });

        test('should reject empty master key', async () => {
            mockSecretQuestion.mockResolvedValue('  '); // whitespace only

            const result = await generatePasswordCommand({
                length: '16',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('主密码不能为空');
        });
    });

    describe('Deterministic password generation', () => {
        test('should generate same password for same inputs', async () => {
            const options = {
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                username: 'user@example.com',
                pwdVersion: '1'
            };

            const result1 = await generatePasswordCommand(options);
            const result2 = await generatePasswordCommand(options);

            expect(result1).toBe(result2);
            expect(result1).toBeDefined();
            expect(result1.length).toBe(16);
        });

        test('should generate different passwords for different sites', async () => {
            const baseOptions = {
                length: '16',
                masterKey: 'test123',
                username: 'user@example.com',
                pwdVersion: '1'
            };

            const result1 = await generatePasswordCommand({
                ...baseOptions,
                site: 'github.com'
            });

            const result2 = await generatePasswordCommand({
                ...baseOptions,
                site: 'google.com'
            });

            expect(result1).not.toBe(result2);
            expect(result1.length).toBe(16);
            expect(result2.length).toBe(16);
        });

        test('should generate different passwords for different usernames', async () => {
            const baseOptions = {
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                pwdVersion: '1'
            };

            const result1 = await generatePasswordCommand({
                ...baseOptions,
                username: 'user1@example.com'
            });

            const result2 = await generatePasswordCommand({
                ...baseOptions,
                username: 'user2@example.com'
            });

            expect(result1).not.toBe(result2);
        });

        test('should generate different passwords for different versions', async () => {
            const baseOptions = {
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                username: 'user@example.com'
            };

            const result1 = await generatePasswordCommand({
                ...baseOptions,
                pwdVersion: '1'
            });

            const result2 = await generatePasswordCommand({
                ...baseOptions,
                pwdVersion: '2'
            });

            expect(result1).not.toBe(result2);
        });

        test('should generate different passwords for different master keys', async () => {
            const baseOptions = {
                length: '16',
                site: 'example.com',
                username: 'user@example.com',
                pwdVersion: '1'
            };

            const result1 = await generatePasswordCommand({
                ...baseOptions,
                masterKey: 'masterkey1'
            });

            const result2 = await generatePasswordCommand({
                ...baseOptions,
                masterKey: 'masterkey2'
            });

            expect(result1).not.toBe(result2);
        });
    });

    describe('Password length and character types', () => {
        test('should generate password with correct length', async () => {
            const lengths = [4, 8, 16, 32, 64, 128];

            for (const length of lengths) {
                const result = await generatePasswordCommand({
                    length: length.toString(),
                    masterKey: 'test123',
                    site: 'example.com'
                });

                expect(result.length).toBe(length);
            }
        });

        test('should contain uppercase letters when enabled', async () => {
            const result = await generatePasswordCommand({
                length: '20',
                masterKey: 'test123',
                site: 'example.com',
                uppercase: true,
                lowercase: false,
                digits: false,
                symbols: false
            });

            expect(result).toMatch(/^[A-Z]+$/);
        });

        test('should contain lowercase letters when enabled', async () => {
            const result = await generatePasswordCommand({
                length: '20',
                masterKey: 'test123',
                site: 'example.com',
                uppercase: false,
                lowercase: true,
                digits: false,
                symbols: false
            });

            expect(result).toMatch(/^[a-z]+$/);
        });

        test('should contain digits when enabled', async () => {
            const result = await generatePasswordCommand({
                length: '20',
                masterKey: 'test123',
                site: 'example.com',
                uppercase: false,
                lowercase: false,
                digits: true,
                symbols: false
            });

            expect(result).toMatch(/^[0-9]+$/);
        });

        test('should contain symbols when enabled', async () => {
            const result = await generatePasswordCommand({
                length: '20',
                masterKey: 'test123',
                site: 'example.com',
                uppercase: false,
                lowercase: false,
                digits: false,
                symbols: true
            });

            expect(result).toMatch(/^[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/);
        });

        test('should contain mix of character types when multiple enabled', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                uppercase: true,
                lowercase: true,
                digits: true,
                symbols: true
            });

            // Should contain at least one of each type
            expect(result).toMatch(/[A-Z]/); // uppercase
            expect(result).toMatch(/[a-z]/); // lowercase
            expect(result).toMatch(/[0-9]/); // digits
            expect(result).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // symbols
        });

        test('should not contain disabled character types', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                uppercase: true,
                lowercase: true,
                digits: false,
                symbols: false
            });

            expect(result).not.toMatch(/[0-9]/); // no digits
            expect(result).not.toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // no symbols
        });
    });

    describe('Password strength analysis', () => {
        test('should display strength analysis when showEntropy is true', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                showEntropy: true
            });

            expect(result).toBeDefined();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('密码强度等级'));
        });

        test('should not display strength analysis when showEntropy is false', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                showEntropy: false
            });

            expect(result).toBeDefined();
            // Should not contain strength analysis output
            const logCalls = console.log.mock.calls.flat().join(' ');
            expect(logCalls).not.toContain('密码强度等级');
        });
    });

    describe('Console output', () => {
        test('should display password generation completion message', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBe('t9::5H7TpONF)xPv');
            expect(console.log).toHaveBeenCalledWith('\n🔐 密码生成完成：', result);
        });

        test('should display success message in output', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123456',
                site: 'example.com'
            });

            expect(result).toBe('@(%_;0gvgK&:A2W+');
            // Check that console.log was called with some output
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        test('should handle minimum length password', async () => {
            const result = await generatePasswordCommand({
                length: '4',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(4);
        });

        test('should handle maximum length password', async () => {
            const result = await generatePasswordCommand({
                length: '128',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(128);
        });

        test('should handle empty username parameter', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                username: ''
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(16);
        });

        test('should handle special characters in site name', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'test-site.example.com',
                username: 'user+tag@example.com'
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(16);
        });

        test('should handle unicode characters in inputs', async () => {
            const result = await generatePasswordCommand({
                length: '16',
                masterKey: '测试密码123',
                site: '测试网站.com',
                username: '用户@测试.com'
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(16);
        });
    });

    describe('Error handling', () => {
        test('should handle errors gracefully', async () => {
            // Mock an error in the generation process
            const originalPbkdf2Sync = crypto.pbkdf2Sync;
            crypto.pbkdf2Sync = jest.fn(() => {
                throw new Error('Mocked crypto error');
            });

            const result = await generatePasswordCommand({
                length: '16',
                masterKey: 'test123',
                site: 'example.com'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('❌ 密码生成失败:', 'Mocked crypto error');

            // Restore original function
            crypto.pbkdf2Sync = originalPbkdf2Sync;
        });
    });

    describe('Consistency and reproducibility', () => {
        test('should be reproducible across multiple runs', async () => {
            const options = {
                length: '16',
                masterKey: 'consistent-master-key',
                site: 'consistent-site.com',
                username: 'consistent-user',
                pwdVersion: '1'
            };

            const results = [];
            for (let i = 0; i < 10; i++) {
                const result = await generatePasswordCommand(options);
                results.push(result);
            }

            // All results should be identical
            const firstResult = results[0];
            for (const result of results) {
                expect(result).toBe(firstResult);
            }
        });

        test('should generate different passwords for sequential version increments', async () => {
            const baseOptions = {
                length: '16',
                masterKey: 'test123',
                site: 'example.com',
                username: 'user@example.com'
            };

            const passwords = [];
            for (let version = 1; version <= 5; version++) {
                const result = await generatePasswordCommand({
                    ...baseOptions,
                    pwdVersion: version.toString()
                });
                passwords.push(result);
            }

            // All passwords should be different
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(passwords.length);
        });
    });
});
