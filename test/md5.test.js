const crypto = require('crypto');

// Mock question utility
const mockQuestion = jest.fn();
jest.mock('../src/utils', () => ({
    question: mockQuestion
}));


const md5Command = require('../src/command/md5');

describe('MD5 Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn(); // Mock console.log
        console.error = jest.fn(); // Mock console.error
    });

    describe('Content input modes', () => {
        test('should use provided content with all required parameters', async () => {
            const testInput = 'hello world';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5);
            expect(console.log).toHaveBeenCalledWith(`MD5 哈希值: ${expectedMd5}`);
            expect(mockQuestion).not.toHaveBeenCalled(); // Should not ask for input
        });

        test('should prompt for input when no content is provided', async () => {
            const testInput = 'hello world';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            mockQuestion.mockResolvedValue(testInput);

            const result = await md5Command({
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5);
            expect(console.log).toHaveBeenCalledWith(`MD5 哈希值: ${expectedMd5}`);
            expect(mockQuestion).toHaveBeenCalledWith('请输入内容: ');
        });

        test('should trim input from question but not from content', async () => {
            const testInput = '  hello world  ';
            const trimmedInput = 'hello world';
            const expectedMd5 = crypto.createHash('md5').update(trimmedInput).digest('hex');

            mockQuestion.mockResolvedValue(testInput);
            const result1 = await md5Command({
                iteration: '1',
                length: '32',
                base64: false
            });
            expect(result1).toBe(expectedMd5);

            // Test with content - should not trim
            const expectedMd5WithSpaces = crypto.createHash('md5').update(testInput).digest('hex');
            const result2 = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });
            expect(result2).toBe(expectedMd5WithSpaces);
        });
    });

    describe('Required parameters validation', () => {
        test('should return undefined when missing iteration parameter', async () => {
            const result = await md5Command({
                content: 'test',
                length: '32',
                base64: false
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('参数错误');
        });

        test('should return undefined when missing length parameter', async () => {
            const result = await md5Command({
                content: 'test',
                iteration: '1',
                base64: false
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('参数错误');
        });

        test('should return undefined when missing base64 parameter', async () => {
            const result = await md5Command({
                content: 'test',
                iteration: '1',
                length: '32'
            });

            expect(result).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('参数错误');
        });

        test('should return undefined for empty input from question', async () => {
            mockQuestion.mockResolvedValue('');

            const result = await md5Command({
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBeUndefined();
            expect(console.log).not.toHaveBeenCalled();
        });

        test('should return undefined for empty content', async () => {
            const result = await md5Command({
                content: '',
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBeUndefined();
            expect(console.log).not.toHaveBeenCalled();
        });

        test('should handle invalid parameter values', async () => {
            // Test with invalid iteration that causes NaN
            const result1 = await md5Command({
                content: 'test',
                iteration: 'invalid',
                length: '32',
                base64: false
            });

            expect(result1).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('参数错误');

            // Test with invalid length that causes NaN
            const result2 = await md5Command({
                content: 'test',
                iteration: '1',
                length: 'invalid',
                base64: false
            });

            expect(result2).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('参数错误');

            // Test with non-boolean base64 parameter
            const result3 = await md5Command({
                content: 'test',
                iteration: '1',
                length: '32',
                base64: 'not-boolean'
            });

            expect(result3).toBeUndefined();
            expect(console.error).toHaveBeenCalledWith('参数错误');
        });
    });

    describe('Basic MD5 hash calculation', () => {
        test('should calculate MD5 hash for simple string', async () => {
            const testInput = 'hello world';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5);
            expect(console.log).toHaveBeenCalledWith(`MD5 哈希值: ${expectedMd5}`);
        });

        test('should handle special characters', async () => {
            const testInput = '测试中文!@#$%^&*()';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5);
        });
    });

    describe('Iteration functionality', () => {
        test('should perform multiple iterations when specified', async () => {
            const testInput = 'test';
            const iterations = 3;

            let hash = testInput;
            for (let i = 0; i < iterations; i++) {
                hash = crypto.createHash('md5').update(hash).digest('hex');
            }

            const result = await md5Command({
                content: testInput,
                iteration: iterations.toString(),
                length: '32',
                base64: false
            });

            expect(result).toBe(hash);
            expect(console.log).toHaveBeenCalledWith(
                `迭代 ${iterations} 次,`,
                `MD5 哈希值: ${hash}`
            );
        });

        test('should handle negative iteration values', async () => {
            const testInput = 'test';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '-5',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5); // Should default to 1
        });

        test('should handle zero iteration', async () => {
            const testInput = 'test';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '0',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5); // Should default to 1
        });
    });

    describe('Length truncation functionality', () => {
        test('should truncate hash to specified length', async () => {
            const testInput = 'test';
            const length = 16;
            const fullMd5 = crypto.createHash('md5').update(testInput).digest('hex');
            const truncatedMd5 = fullMd5.substring(0, length);

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: length.toString(),
                base64: false
            });

            expect(result).toBe(truncatedMd5);
            expect(console.log).toHaveBeenCalledWith(
                `前面 ${length} 位,`,
                `MD5 哈希值: ${truncatedMd5}`
            );
        });

        test('should not truncate if length is greater than 32', async () => {
            const testInput = 'test';
            const fullMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '50',
                base64: false
            });

            expect(result).toBe(fullMd5);
            expect(result.length).toBe(32); // Full MD5 length
        });

        test('should handle length of 0', async () => {
            const testInput = 'test';

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '0',
                base64: false
            });

            expect(result).toBe('');
        });

        test('should handle negative length values', async () => {
            const testInput = 'test';

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '-5',
                base64: false
            });

            // Negative length results in substring(0, -5) which returns empty string
            expect(result).toBe('');
            expect(console.log).toHaveBeenCalledWith(
                `前面 -5 位,`,
                `MD5 哈希值: `
            );
        });
    });

    describe('Base64 conversion functionality', () => {
        test('should convert MD5 hash to base64 when specified', async () => {
            const testInput = 'test';
            const md5Hash = crypto.createHash('md5').update(testInput).digest('hex');
            const base64Hash = Buffer.from(md5Hash).toString('base64');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: true
            });

            expect(result).toBe(base64Hash);
            expect(console.log).toHaveBeenCalledWith(
                `转为 base64,`,
                `MD5 哈希值: ${base64Hash}`
            );
        });

        test('should not convert to base64 when false', async () => {
            const testInput = 'test';
            const md5Hash = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(md5Hash);
        });
    });

    describe('Combined options functionality', () => {
        test('should handle multiple iterations with length truncation', async () => {
            const testInput = 'test';
            const iterations = 2;
            const length = 10;

            let hash = testInput;
            for (let i = 0; i < iterations; i++) {
                hash = crypto.createHash('md5').update(hash).digest('hex');
            }
            const truncatedHash = hash.substring(0, length);

            const result = await md5Command({
                content: testInput,
                iteration: iterations.toString(),
                length: length.toString(),
                base64: false
            });

            expect(result).toBe(truncatedHash);
            expect(console.log).toHaveBeenCalledWith(
                `迭代 ${iterations} 次,`,
                `前面 ${length} 位,`,
                `MD5 哈希值: ${truncatedHash}`
            );
        });

        test('should handle multiple iterations with base64 conversion', async () => {
            const testInput = 'test';
            const iterations = 2;

            let hash = testInput;
            for (let i = 0; i < iterations; i++) {
                hash = crypto.createHash('md5').update(hash).digest('hex');
            }
            const base64Hash = Buffer.from(hash).toString('base64');

            const result = await md5Command({
                content: testInput,
                iteration: iterations.toString(),
                length: '32',
                base64: true
            });

            expect(result).toBe(base64Hash);
            expect(console.log).toHaveBeenCalledWith(
                `迭代 ${iterations} 次,`,
                `转为 base64,`,
                `MD5 哈希值: ${base64Hash}`
            );
        });

        test('should handle base64 conversion with length truncation', async () => {
            const testInput = 'test';
            const length = 20;

            const md5Hash = crypto.createHash('md5').update(testInput).digest('hex');
            const base64Hash = Buffer.from(md5Hash).toString('base64');
            const truncatedBase64 = base64Hash.substring(0, length);

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: length.toString(),
                base64: true
            });

            expect(result).toBe(truncatedBase64);
            expect(console.log).toHaveBeenCalledWith(
                `转为 base64,`,
                `前面 ${length} 位,`,
                `MD5 哈希值: ${truncatedBase64}`
            );
        });

        test('should handle all options combined (iteration + base64 + length)', async () => {
            const testInput = 'test';
            const iterations = 3;
            const length = 15;

            let hash = testInput;
            for (let i = 0; i < iterations; i++) {
                hash = crypto.createHash('md5').update(hash).digest('hex');
            }
            const base64Hash = Buffer.from(hash).toString('base64');
            const truncatedBase64 = base64Hash.substring(0, length);

            const result = await md5Command({
                content: testInput,
                iteration: iterations.toString(),
                length: length.toString(),
                base64: true
            });

            expect(result).toBe(truncatedBase64);
            expect(console.log).toHaveBeenCalledWith(
                'OK!',
                `迭代 ${iterations} 次,`,
                `转为 base64,`,
                `前面 ${length} 位,`,
                `MD5 哈希值: ${truncatedBase64}`
            );
        });
    });

    describe('Known MD5 test vectors', () => {
        test('should correctly calculate MD5 for known test vectors', async () => {
            const testVectors = [
                { input: 'a', expected: '0cc175b9c0f1b6a831c399e269772661' },
                { input: 'abc', expected: '900150983cd24fb0d6963f7d28e17f72' },
                { input: 'message digest', expected: 'f96b697d7cb7938d525a2f31aaf161d0' },
                { input: 'abcdefghijklmnopqrstuvwxyz', expected: 'c3fcd3d76192e4007dfb496cca67e13b' },
                { input: '1234567890', expected: 'e807f1fcf82d132f9bb018ca6738a19f' }
            ];

            for (const vector of testVectors) {
                const result = await md5Command({
                    content: vector.input,
                    iteration: '1',
                    length: '32',
                    base64: false
                });
                expect(result).toBe(vector.expected);
            }
        });

        test('should handle very long input strings', async () => {
            const testInput = 'a'.repeat(1000);
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5);
        });
    });

    describe('Edge cases and boundary conditions', () => {
        test('should handle whitespace-only content', async () => {
            const testInput = '   ';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5);
        });

        test('should handle newline characters', async () => {
            const testInput = 'line1\nline2\r\nline3';
            const expectedMd5 = crypto.createHash('md5').update(testInput).digest('hex');

            const result = await md5Command({
                content: testInput,
                iteration: '1',
                length: '32',
                base64: false
            });

            expect(result).toBe(expectedMd5);
        });

        test('should return undefined when options is null', async () => {
            mockQuestion.mockResolvedValue('test');

            await expect(async () => {
                await md5Command(null);
            }).rejects.toThrow();
        });
    });
});
