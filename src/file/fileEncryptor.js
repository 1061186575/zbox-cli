const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileEncryptor {
    constructor(key) {
        // 从输入的key生成32字节的加密密钥
        this.key = crypto.createHash('sha256').update(String(key)).digest();
        this.algorithm = 'aes-256-gcm';
        this.ivLength = 16;
        this.saltLength = 64;
        this.tagLength = 16;
    }

    /**
     * 处理文件或目录
     * @param {string} inputPath - 文件或目录路径
     * @param {string} operation - 'encrypt' 或 'decrypt'
     * @param {string} [outputPath] - 输出路径（可选）
     * @param {boolean} [recursive] - 是否递归处理子目录
     * @param {string} [extension] - 加密文件后缀
     */
    async process(inputPath, operation, options = {}) {
        const {
            outputPath,
            recursive = true,
            extension = operation === 'encrypt' ? '.encrypted' : '.decrypted',
            overwrite = false
        } = options;

        try {
            const stats = await fs.promises.stat(inputPath);

            if (stats.isFile()) {
                // 处理单个文件
                const output = outputPath || this.getOutputPath(inputPath, operation, extension);
                await this.processFile(inputPath, output, operation, overwrite);
                console.log(`${operation === 'encrypt' ? '🔒 加密' : '🔓 解密'}完成: ${inputPath} -> ${output}`);
            } else if (stats.isDirectory()) {
                // 处理目录
                const outputDir = outputPath || this.getOutputPath(inputPath, operation, extension);
                await this.processDirectory(inputPath, outputDir, operation, { recursive, extension, overwrite });
                console.log(`${operation === 'encrypt' ? '🔒 加密' : '🔓 解密'}目录完成: ${inputPath} -> ${outputDir}`);
            } else {
                throw new Error('输入路径必须是文件或目录');
            }
        } catch (error) {
            throw new Error(`处理失败: ${error.message}`);
        }
    }

    /**
     * 处理单个文件
     */
    async processFile(inputFile, outputFile, operation, overwrite = false) {
        // 检查输出文件是否存在
        if (!overwrite && fs.existsSync(outputFile)) {
            throw new Error(`输出文件已存在: ${outputFile}，使用 --overwrite 参数覆盖`);
        }

        const inputData = await fs.promises.readFile(inputFile);
        let outputData;

        if (operation === 'encrypt') {
            outputData = this.encrypt(inputData);
        } else if (operation === 'decrypt') {
            outputData = this.decrypt(inputData);
        } else {
            throw new Error('操作必须是 encrypt 或 decrypt');
        }

        // 确保输出目录存在
        const outputDir = path.dirname(outputFile);
        await fs.promises.mkdir(outputDir, { recursive: true });

        await fs.promises.writeFile(outputFile, outputData);
    }

    /**
     * 处理目录
     */
    async processDirectory(inputDir, outputDir, operation, options) {
        const { recursive = true, extension, overwrite = false } = options;

        // 确保输出目录存在
        await fs.promises.mkdir(outputDir, { recursive: true });

        // 读取目录内容
        const items = await fs.promises.readdir(inputDir, { withFileTypes: true });

        // 处理所有项目
        for (const item of items) {
            const sourcePath = path.join(inputDir, item.name);
            const targetPath = path.join(outputDir, item.name);

            try {
                if (item.isFile()) {
                    // 处理文件
                    const fileOutputPath = this.getOutputPath(targetPath, operation, extension);
                    await this.processFile(sourcePath, fileOutputPath, operation, overwrite);
                } else if (item.isDirectory() && recursive) {
                    // 递归处理子目录
                    await this.processDirectory(sourcePath, targetPath, operation, options);
                } else if (item.isDirectory() && !recursive) {
                    // 不递归处理，只复制目录结构
                    await fs.promises.mkdir(targetPath, { recursive: true });
                }
            } catch (error) {
                console.warn(`跳过 ${sourcePath}: ${error.message}`);
            }
        }
    }

    /**
     * 加密数据
     */
    encrypt(plaintext) {
        // 生成随机盐、IV和认证标签
        const salt = crypto.randomBytes(this.saltLength);
        const iv = crypto.randomBytes(this.ivLength);

        // 使用盐派生密钥
        const derivedKey = crypto.pbkdf2Sync(this.key, salt, 100000, 32, 'sha256');

        // 创建加密器
        const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

        // 加密数据
        const encrypted = Buffer.concat([
            cipher.update(plaintext),
            cipher.final()
        ]);

        // 获取认证标签
        const tag = cipher.getAuthTag();

        // 返回格式: 盐长度(1字节) + 盐 + IV + 标签 + 加密数据
        const saltLengthBuffer = Buffer.from([this.saltLength]);

        return Buffer.concat([
            saltLengthBuffer,
            salt,
            iv,
            tag,
            encrypted
        ]);
    }

    /**
     * 解密数据
     */
    decrypt(ciphertext) {
        try {
            let offset = 0;

            // 读取盐长度
            const saltLength = ciphertext[offset];
            offset += 1;

            // 检查盐长度是否有效
            if (saltLength !== this.saltLength) {
                throw new Error('无效的加密文件格式');
            }

            // 读取盐
            const salt = ciphertext.slice(offset, offset + saltLength);
            offset += saltLength;

            // 读取IV
            const iv = ciphertext.slice(offset, offset + this.ivLength);
            offset += this.ivLength;

            // 读取认证标签
            const tag = ciphertext.slice(offset, offset + this.tagLength);
            offset += this.tagLength;

            // 读取加密数据
            const encrypted = ciphertext.slice(offset);

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

            return decrypted;
        } catch (error) {
            throw new Error(`解密失败: ${error.message}`);
        }
    }

    /**
     * 获取输出路径
     */
    getOutputPath(inputPath, operation, extension) {
        if (operation === 'encrypt') {
            return inputPath + (extension || '.encrypted');
        } else if (operation === 'decrypt') {
            if (extension) {
                if (inputPath.endsWith(extension)) {
                    return inputPath.slice(0, -extension.length);
                }
                return inputPath + extension;
            }

            // 默认处理：移除 .encrypted 后缀
            if (inputPath.endsWith('.encrypted')) {
                return inputPath.replace(/\.encrypted$/, '');
            }
            return inputPath + '.decrypted';
        }
        return inputPath;
    }

    /**
     * 验证文件是否为有效的加密文件
     */
    static isEncryptedFile(filePath) {
        try {
            const stats = fs.statSync(filePath);
            if (!stats.isFile()) return false;

            const data = fs.readFileSync(filePath);
            if (data.length < 100) return false; // 加密文件至少有一定长度

            const saltLength = data[0];
            if (saltLength !== 64) return false; // 我们的盐长度是64

            return true;
        } catch {
            return false;
        }
    }
}

// ==================== CLI 接口函数 ====================

/**
 * 加密文件或目录（CLI接口）
 */
async function encryptCLI(inputPath, key, options = {}) {
    const encryptor = new FileEncryptor(key);
    await encryptor.process(inputPath, 'encrypt', {
        outputPath: options.output,
        recursive: options.recursive,
        extension: options.extension,
        overwrite: options.overwrite
    });
}

/**
 * 解密文件或目录（CLI接口）
 */
async function decryptCLI(inputPath, key, options = {}) {
    const encryptor = new FileEncryptor(key);
    await encryptor.process(inputPath, 'decrypt', {
        outputPath: options.output,
        recursive: options.recursive,
        extension: options.extension,
        overwrite: options.overwrite
    });
}

// 导出模块
module.exports = {
    FileEncryptor,
    encryptCLI,
    decryptCLI,
    isEncryptedFile: FileEncryptor.isEncryptedFile
};
