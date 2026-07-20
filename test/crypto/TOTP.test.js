const mockSecretQuestion = jest.fn();
const mockFormatDateTime = jest.fn();

jest.mock('../../src/utils', () => ({
    secretQuestion: mockSecretQuestion,
    formatDateTime: mockFormatDateTime
}));

const totpCommand = require('../../src/crypto/totp');

describe('TOTP Command', () => {
    const REAL_DATE_NOW = Date.now;
    const RFC_BASE32_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
        mockFormatDateTime.mockReturnValue('2026-01-01 00:00:00');
    });

    afterEach(() => {
        Date.now = REAL_DATE_NOW;
    });

    test('should generate expected TOTP code from RFC 6238 test vector', async () => {
        // RFC 6238 (SHA1, step=30, digits=8): T=59 => 94287082
        Date.now = jest.fn(() => 59 * 1000);
        mockSecretQuestion.mockResolvedValue(RFC_BASE32_SECRET);

        const code = await totpCommand({
            step: 30,
            digits: 8
        });

        expect(code).toBe('94287082');
        expect(mockSecretQuestion).toHaveBeenCalledWith('Please enter your secret key (base32): ');
        expect(console.log).toHaveBeenCalledWith('\nTOTP code:', '94287082');
    });

    test('should return early when secret is empty', async () => {
        mockSecretQuestion.mockResolvedValue('');

        const result = await totpCommand({
            step: 30,
            digits: 6
        });

        expect(result).toBeUndefined();
        expect(console.log).toHaveBeenCalledWith('Secret cannot be empty');
    });

    test('should generate 6-digit TOTP code', async () => {
        // RFC 6238 (SHA1): T=59 时 8 位是 94287082，6 位应为 287082
        Date.now = jest.fn(() => 59 * 1000);
        mockSecretQuestion.mockResolvedValue(RFC_BASE32_SECRET);

        const code = await totpCommand({
            step: 30,
            digits: 6
        });

        expect(code).toBe('287082');
        expect(code).toHaveLength(6);
        expect(console.log).toHaveBeenCalledWith('\nTOTP code:', '287082');
    });
});
