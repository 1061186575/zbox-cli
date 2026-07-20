const mockQuestion = jest.fn();
const mockMultilineQuestion = jest.fn();
const mockToString = jest.fn();
const mockToFile = jest.fn();

jest.mock('../../src/utils', () => ({
    question: mockQuestion,
    multilineQuestion: mockMultilineQuestion
}));

jest.mock('qrcode', () => ({
    toString: mockToString,
    toFile: mockToFile
}));

const qrcodeCommand = require('../../src/command/qrcode');

describe('QRCode Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    test('should generate terminal QR code from text option', async () => {
        mockToString.mockResolvedValue('terminal qrcode');

        const result = await qrcodeCommand({
            text: 'hello'
        });

        expect(result).toBe('terminal qrcode');
        expect(mockQuestion).not.toHaveBeenCalled();
        expect(mockToString).toHaveBeenCalledWith('hello', {
            type: 'terminal',
            small: true,
            errorCorrectionLevel: 'M'
        });
        expect(console.log).toHaveBeenCalledWith('terminal qrcode');
    });

    test('should prompt for text when text option is not provided', async () => {
        mockQuestion.mockResolvedValue('  hello from prompt  ');
        mockToString.mockResolvedValue('prompt qrcode');

        const result = await qrcodeCommand({});

        expect(result).toBe('prompt qrcode');
        expect(mockQuestion).toHaveBeenCalledWith('请输入二维码内容: ');
        expect(mockToString).toHaveBeenCalledWith('hello from prompt', {
            type: 'terminal',
            small: true,
            errorCorrectionLevel: 'M'
        });
    });

    test('should prompt for multiline text when multiline option is provided', async () => {
        mockMultilineQuestion.mockResolvedValue('line 1\nline 2');
        mockToString.mockResolvedValue('multiline qrcode');

        const result = await qrcodeCommand({
            multiline: true
        });

        expect(result).toBe('multiline qrcode');
        expect(mockQuestion).not.toHaveBeenCalled();
        expect(mockMultilineQuestion).toHaveBeenCalledWith('请输入二维码内容');
        expect(mockToString).toHaveBeenCalledWith('line 1\nline 2', {
            type: 'terminal',
            small: true,
            errorCorrectionLevel: 'M'
        });
    });

    test('should write QR code image when output option is provided', async () => {
        mockToFile.mockResolvedValue();

        const result = await qrcodeCommand({
            text: 'hello',
            output: 'qr.png'
        });

        expect(result).toBe('qr.png');
        expect(mockToFile).toHaveBeenCalledWith('qr.png', 'hello', {
            errorCorrectionLevel: 'M'
        });
        expect(mockToString).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('二维码已保存到: qr.png');
    });

    test('should reject empty text', async () => {
        mockQuestion.mockResolvedValue('   ');

        const result = await qrcodeCommand({});

        expect(result).toBeUndefined();
        expect(mockToString).not.toHaveBeenCalled();
        expect(mockToFile).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('二维码内容不能为空');
    });
});
