const crypto = require('crypto');
const { secretQuestion, formatDateTime } = require("../utils");

/**
 * 将 Base32 编码的字符串解码为 Buffer
 * @param {string} base32 - Base32 编码的密钥
 * @returns {Buffer} 解码后的字节数据
 */
function base32ToBuffer(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    // 去除可能存在的等号填充，并转为大写
    let cleanBase32 = base32.replace(/=+$/, '').toUpperCase();

    let bits = 0;
    let value = 0;
    let index = 0;
    const output = Buffer.alloc(Math.floor(cleanBase32.length * 5 / 8));

    for (let i = 0; i < cleanBase32.length; i++) {
        value = (value << 5) | alphabet.indexOf(cleanBase32[i]);
        bits += 5;

        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return output;
}

/**
 * 生成 TOTP 验证码
 * @param {string} secretBase32 - Base32 编码的密钥 (如 "JBSWY3DPEHPK3PXP")
 * @param {number} step - 时间步长，默认 30 秒
 * @param {number} digits - 验证码长度，默认 6 位
 * @returns {string} 生成的动态验证码
 */
function generateTOTP(secretBase32, step = 30, digits = 6) {
    // 1. 获取密钥的 Buffer
    const key = base32ToBuffer(secretBase32);

    // 2. 计算当前的时间计数器 (Time Counter)
    const timeInSeconds = Math.floor(Date.now() / 1000);
    const counter = Math.floor(timeInSeconds / step);

    // 3. 将计数器转换为 8 字节的 Buffer (大端序 Big-Endian)
    const counterBuffer = Buffer.alloc(8);
    const high = Math.floor(counter / (2 ** 32)); // 处理高位
    const low = counter % (2 ** 32);              // 处理低位
    counterBuffer.writeUInt32BE(high, 0);
    counterBuffer.writeUInt32BE(low, 4);

    // 4. 使用 HMAC-SHA1 计算哈希
    const hmac = crypto.createHmac('sha1', key)
        .update(counterBuffer)
        .digest();

    // 5. 动态截断 (Dynamic Truncation)
    // 取 HMAC 的最后一个字节的低 4 位作为偏移量 (offset)
    const offset = hmac[hmac.length - 1] & 0x0f;

    // 从 offset 开始提取 4 个字节，并屏蔽最高位的符号位 (0x7f)
    const code = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    // 6. 对 10^digits 取模，得到最终的数字
    const totp = code % (10 ** digits);

    // 7. 转成字符串，如果不足位数则在前面补零
    return totp.toString().padStart(digits, '0');
}

async function main(options) {
    const {
        step,
        digits,
    } = options;

    // 不允许通过命令参数传入密钥, 防止意外泄露
    let secret = await secretQuestion('Please enter your secret key (base32): ');
    if (!secret.length) {
        return console.log('Secret cannot be empty');
    }

    const time = formatDateTime();
    const currentCode = generateTOTP(secret, step, digits);

    console.log(`secret key length:`, secret.length);
    console.log(`time:`, time, new Date());
    console.log('\nTOTP code:', currentCode);
    return currentCode;
}

module.exports = main;
