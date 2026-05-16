const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { copyToClipboard } = require("../utils");

class StringEncryptor {
    constructor(key) {
        // 从输入的key生成32字节的加密密钥
        this.key = crypto.createHash('sha256').update(String(key)).digest();
        this.algorithm = 'aes-256-gcm';
        this.ivLength = 16;
        this.saltLength = 32;
        this.tagLength = 16;
    }

    /**
     * 加密字符串
     * @param {string} plaintext - 要加密的明文字符串
     * @returns {string} - Base64编码的加密结果
     */
    encrypt(plaintext) {
        // 生成随机盐和IV
        const salt = crypto.randomBytes(this.saltLength);
        const iv = crypto.randomBytes(this.ivLength);

        // 使用盐派生密钥
        const derivedKey = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha256');

        // 创建加密器
        const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

        // 加密数据
        const encrypted = Buffer.concat([
            cipher.update(Buffer.from(plaintext, 'utf8')),
            cipher.final()
        ]);

        // 获取认证标签
        const tag = cipher.getAuthTag();

        // 组合所有数据：盐 + IV + 标签 + 加密数据
        const result = Buffer.concat([salt, iv, tag, encrypted]);

        // 返回Base64编码的结果
        return result.toString('base64');
    }

    /**
     * 解密字符串
     * @param {string} ciphertext - Base64编码的加密字符串
     * @returns {string} - 解密后的明文字符串
     */
    decrypt(ciphertext) {
        try {
            // 从Base64解码
            const data = Buffer.from(ciphertext, 'base64');

            let offset = 0;

            // 读取盐
            const salt = data.slice(offset, offset + this.saltLength);
            offset += this.saltLength;

            // 读取IV
            const iv = data.slice(offset, offset + this.ivLength);
            offset += this.ivLength;

            // 读取认证标签
            const tag = data.slice(offset, offset + this.tagLength);
            offset += this.tagLength;

            // 读取加密数据
            const encrypted = data.slice(offset);

            // 派生密钥
            const derivedKey = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha256');

            // 创建解密器
            const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);
            decipher.setAuthTag(tag);

            // 解密数据
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);

            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error(`解密失败: ${error.message}`);
        }
    }

    /**
     * 验证加密字符串格式
     * @param {string} ciphertext - 要验证的加密字符串
     * @returns {boolean} - 是否为有效格式
     */
    static isValidEncryptedString(ciphertext) {
        try {
            const data = Buffer.from(ciphertext, 'base64');
            // 最小长度检查：盐(32) + IV(16) + 标签(16) + 至少1字节数据
            return data.length >= 65;
        } catch {
            return false;
        }
    }
}


// ==================== CLI 接口函数 ====================

/**
 * 加密字符串（CLI接口）
 */
async function encryptStringCLI(plaintext, key) {
    if (!plaintext) {
        throw new Error('请提供要加密的字符串');
    }
    if (!key) {
        throw new Error('请提供加密密钥');
    }

    const encryptor = new StringEncryptor(key);
    const encrypted = encryptor.encrypt(plaintext);

    console.log('🔒 加密完成！');
    console.log('明文:', plaintext);
    console.log('密文:', encrypted);

    // 如果内容很长, 部分终端输出的内容可能和实际内容不一致, 所以直接复制到粘贴板
    const copied = copyToClipboard(encrypted);
    if (copied) {
        console.log('📋 密文已复制到粘贴板');
    } else {
        console.log('⚠️  无法复制到粘贴板，请手动复制文件内容');
        const encryptedPath = path.join(process.cwd(), `encrypted-${Date.now()}.txt`);
        fs.writeFileSync(encryptedPath, encrypted);
        console.log(`✅ 密文已保存到 ${encryptedPath} 文件`);
    }

    return encrypted;
}

/**
 * 解密字符串（CLI接口）
 */
async function decryptStringCLI(ciphertext, key) {
    if (!ciphertext) {
        throw new Error('请提供要解密的字符串');
    }
    if (!key) {
        throw new Error('请提供解密密钥');
    }

    // 验证加密字符串格式
    if (!StringEncryptor.isValidEncryptedString(ciphertext)) {
        throw new Error('无效的加密字符串格式');
    }

    const encryptor = new StringEncryptor(key);
    const decrypted = encryptor.decrypt(ciphertext);

    console.log('🔓 解密完成！');
    console.log('密文:', ciphertext);
    console.log('明文:', decrypted);

    // 如果内容很长, 部分终端输出的内容可能和实际内容不一致, 所以直接复制到粘贴板
    const copied = copyToClipboard(decrypted);
    if (copied) {
        console.log('📋 明文已复制到粘贴板');
    } else {
        console.log('⚠️  无法复制到粘贴板，请手动复制文件内容');
        const decryptedPath = path.join(process.cwd(), `decrypted-${Date.now()}.txt`);
        fs.writeFileSync(decryptedPath, decrypted);
        console.log(`✅ 密文已保存到 ${decryptedPath} 文件`);
    }

    return decrypted;
}

// 导出模块
module.exports = {
    StringEncryptor,
    encryptStringCLI,
    decryptStringCLI,
    isValidEncryptedString: StringEncryptor.isValidEncryptedString
};
