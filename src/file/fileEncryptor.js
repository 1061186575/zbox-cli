const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');

const SMALL_FILE_MAX_SIZE = 10 * 1024 * 1024;

class fileEncryptor {
    constructor(key) {
        this.key = crypto.createHash('sha256').update(String(key)).digest();
        this.algorithm = 'aes-256-gcm';
        this.ivLength = 16;
        this.saltLength = 64;
        this.tagLength = 16;
        this.headerLength = 1 + this.saltLength + this.ivLength + this.tagLength;
    }

    async process(inputPath, operation, options = {}) {
        const resolvedInputPath = path.resolve(inputPath);
        const {
            outputPath,
            recursive = true,
            extension = '.encrypted',
            overwrite = false,
            deleteSource = false
        } = options;

        this.validateOperation(operation);

        let temporaryOutputPath;

        try {
            const stats = await fs.promises.stat(resolvedInputPath);
            const resolvedOutputPath = path.resolve(
                outputPath || this.getOutputPath(resolvedInputPath, operation, extension)
            );

            await this.validatePaths(resolvedInputPath, resolvedOutputPath, stats, {
                overwrite,
                deleteSource,
                recursive
            });

            temporaryOutputPath = this.getTemporaryPath(resolvedOutputPath, 'processing');
            await fs.promises.mkdir(path.dirname(temporaryOutputPath), { recursive: true });

            if (stats.isFile()) {
                await this.processFile(resolvedInputPath, temporaryOutputPath, operation);
            } else if (stats.isDirectory()) {
                await this.processDirectory(resolvedInputPath, temporaryOutputPath, operation, { recursive });
            } else {
                throw new Error('输入路径必须是文件或目录');
            }

            await this.replaceOutput(temporaryOutputPath, resolvedOutputPath, overwrite);
            temporaryOutputPath = undefined;

            if (deleteSource) {
                await fs.promises.rm(resolvedInputPath, { recursive: stats.isDirectory() });
            }

            return resolvedOutputPath;
        } catch (error) {
            if (temporaryOutputPath) {
                await fs.promises.rm(temporaryOutputPath, { recursive: true, force: true }).catch(() => {});
            }
            throw new Error(`处理失败: ${error.message}`);
        }
    }

    validateOperation(operation) {
        if (operation !== 'encrypt' && operation !== 'decrypt') {
            throw new Error('操作必须是 encrypt 或 decrypt');
        }
    }

    async validatePaths(inputPath, outputPath, stats, options) {
        const { overwrite, deleteSource, recursive } = options;
        const outputExists = await this.pathExists(outputPath);

        if (outputExists && !overwrite) {
            throw new Error(`输出文件已存在: ${outputPath}，使用 --overwrite 参数覆盖`);
        }

        const physicalInputPath = await this.resolvePhysicalPath(inputPath);
        const physicalOutputPath = await this.resolvePhysicalPath(outputPath);
        const isSamePath = physicalInputPath === physicalOutputPath;

        if (deleteSource && isSamePath) {
            throw new Error('删除源路径时，输出路径不能与源路径相同');
        }

        if (stats.isDirectory()) {
            const outputInsideInput = this.isSubPath(physicalInputPath, physicalOutputPath);
            const inputInsideOutput = this.isSubPath(physicalOutputPath, physicalInputPath);

            if (outputInsideInput || inputInsideOutput) {
                throw new Error('目录的输入路径和输出路径不能互相包含');
            }

            if (!recursive && deleteSource) {
                throw new Error('非递归处理目录时不能删除源目录');
            }
        }
    }

    async resolvePhysicalPath(targetPath) {
        const missingParts = [];
        let existingPath = targetPath;

        while (!(await this.pathExists(existingPath))) {
            const parentPath = path.dirname(existingPath);
            if (parentPath === existingPath) break;
            missingParts.unshift(path.basename(existingPath));
            existingPath = parentPath;
        }

        const realExistingPath = await fs.promises.realpath(existingPath);
        return path.resolve(realExistingPath, ...missingParts);
    }

    isSubPath(parentPath, childPath) {
        const relativePath = path.relative(parentPath, childPath);
        return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    }

    async pathExists(targetPath) {
        try {
            await fs.promises.lstat(targetPath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') return false;
            throw error;
        }
    }

    getTemporaryPath(outputPath, type) {
        const randomValue = crypto.randomBytes(8).toString('hex');
        return path.join(
            path.dirname(outputPath),
            `.${path.basename(outputPath)}.${process.pid}.${randomValue}.${type}`
        );
    }

    async replaceOutput(temporaryOutputPath, outputPath, overwrite) {
        const outputExists = await this.pathExists(outputPath);

        if (!outputExists) {
            await fs.promises.rename(temporaryOutputPath, outputPath);
            return;
        }

        if (!overwrite) {
            throw new Error(`输出文件已存在: ${outputPath}，使用 --overwrite 参数覆盖`);
        }

        const backupPath = this.getTemporaryPath(outputPath, 'backup');
        await fs.promises.rename(outputPath, backupPath);

        try {
            await fs.promises.rename(temporaryOutputPath, outputPath);
        } catch (error) {
            await fs.promises.rename(backupPath, outputPath).catch(() => {});
            throw error;
        }

        await fs.promises.rm(backupPath, { recursive: true, force: true });
    }

    async processFile(inputFile, outputFile, operation) {
        const stats = await fs.promises.stat(inputFile);
        await fs.promises.mkdir(path.dirname(outputFile), { recursive: true });

        if (stats.size <= SMALL_FILE_MAX_SIZE) {
            await this.processSmallFile(inputFile, outputFile, operation);
        } else {
            await this.processLargeFile(inputFile, outputFile, operation, stats.size);
        }

        await fs.promises.chmod(outputFile, stats.mode);
    }

    async processSmallFile(inputFile, outputFile, operation) {
        const inputData = await fs.promises.readFile(inputFile);
        const outputData = operation === 'encrypt'
            ? await this.encryptBuffer(inputData)
            : await this.decryptBuffer(inputData);
        await fs.promises.writeFile(outputFile, outputData);
    }

    async processLargeFile(inputFile, outputFile, operation, fileSize) {
        if (operation === 'encrypt') {
            await this.encryptStream(inputFile, outputFile);
        } else {
            await this.decryptStream(inputFile, outputFile, fileSize);
        }
    }

    async processDirectory(inputDir, outputDir, operation, options) {
        const { recursive = true } = options;
        const directoryStats = await fs.promises.stat(inputDir);

        await fs.promises.mkdir(outputDir, { recursive: true });
        const items = await fs.promises.readdir(inputDir, { withFileTypes: true });

        for (const item of items) {
            const sourcePath = path.join(inputDir, item.name);
            const targetPath = path.join(outputDir, item.name);

            if (item.isFile()) {
                await this.processFile(sourcePath, targetPath, operation);
            } else if (item.isDirectory()) {
                if (recursive) {
                    await this.processDirectory(sourcePath, targetPath, operation, options);
                } else {
                    await fs.promises.mkdir(targetPath, { recursive: true });
                }
            } else if (item.isSymbolicLink()) {
                const linkTarget = await fs.promises.readlink(sourcePath);
                await fs.promises.symlink(linkTarget, targetPath);
            } else {
                throw new Error(`不支持的文件类型: ${sourcePath}`);
            }
        }

        await fs.promises.chmod(outputDir, directoryStats.mode);
    }

    async deriveKey(salt) {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(this.key, salt, 100000, 32, 'sha256', (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(derivedKey);
            });
        });
    }

    async encryptBuffer(plaintext) {
        const salt = crypto.randomBytes(this.saltLength);
        const iv = crypto.randomBytes(this.ivLength);
        const derivedKey = await this.deriveKey(salt);
        const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();

        return Buffer.concat([
            Buffer.from([this.saltLength]),
            salt,
            iv,
            tag,
            encrypted
        ]);
    }

    async decryptBuffer(ciphertext) {
        const { salt, iv, tag, encrypted } = this.parseEncryptedBuffer(ciphertext);
        const derivedKey = await this.deriveKey(salt);

        try {
            const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([decipher.update(encrypted), decipher.final()]);
        } catch (error) {
            throw new Error(`解密失败: ${error.message}`);
        }
    }

    parseEncryptedBuffer(ciphertext) {
        if (ciphertext.length < this.headerLength) {
            throw new Error('解密失败: 无效的加密文件格式');
        }

        const saltLength = ciphertext[0];
        if (saltLength !== this.saltLength) {
            throw new Error('解密失败: 无效的加密文件格式');
        }

        let offset = 1;
        const salt = ciphertext.subarray(offset, offset + saltLength);
        offset += saltLength;
        const iv = ciphertext.subarray(offset, offset + this.ivLength);
        offset += this.ivLength;
        const tag = ciphertext.subarray(offset, offset + this.tagLength);
        offset += this.tagLength;

        return {
            salt,
            iv,
            tag,
            encrypted: ciphertext.subarray(offset)
        };
    }

    async encryptStream(inputFile, outputFile) {
        const salt = crypto.randomBytes(this.saltLength);
        const iv = crypto.randomBytes(this.ivLength);
        const derivedKey = await this.deriveKey(salt);
        const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
        const header = Buffer.concat([
            Buffer.from([this.saltLength]),
            salt,
            iv,
            Buffer.alloc(this.tagLength)
        ]);

        await fs.promises.writeFile(outputFile, header);
        await pipeline(
            fs.createReadStream(inputFile),
            cipher,
            fs.createWriteStream(outputFile, { flags: 'a' })
        );

        const fileHandle = await fs.promises.open(outputFile, 'r+');
        try {
            await fileHandle.write(cipher.getAuthTag(), 0, this.tagLength, 1 + this.saltLength + this.ivLength);
        } finally {
            await fileHandle.close();
        }
    }

    async decryptStream(inputFile, outputFile, fileSize) {
        const { salt, iv, tag } = await this.readEncryptedHeader(inputFile, fileSize);
        const derivedKey = await this.deriveKey(salt);
        const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);
        decipher.setAuthTag(tag);

        try {
            await pipeline(
                fs.createReadStream(inputFile, { start: this.headerLength }),
                decipher,
                fs.createWriteStream(outputFile)
            );
        } catch (error) {
            throw new Error(`解密失败: ${error.message}`);
        }
    }

    async readEncryptedHeader(inputFile, fileSize) {
        if (fileSize < this.headerLength) {
            throw new Error('解密失败: 无效的加密文件格式');
        }

        const header = Buffer.alloc(this.headerLength);
        const fileHandle = await fs.promises.open(inputFile, 'r');

        try {
            const { bytesRead } = await fileHandle.read(header, 0, header.length, 0);
            if (bytesRead !== header.length || header[0] !== this.saltLength) {
                throw new Error('解密失败: 无效的加密文件格式');
            }
        } finally {
            await fileHandle.close();
        }

        let offset = 1;
        const salt = header.subarray(offset, offset + this.saltLength);
        offset += this.saltLength;
        const iv = header.subarray(offset, offset + this.ivLength);
        offset += this.ivLength;
        const tag = header.subarray(offset, offset + this.tagLength);

        return { salt, iv, tag };
    }

    getOutputPath(inputPath, operation, extension) {
        const encryptedExtension = extension || '.encrypted';

        if (operation === 'encrypt') {
            return inputPath + encryptedExtension;
        }

        if (inputPath.endsWith(encryptedExtension)) {
            return inputPath.slice(0, -encryptedExtension.length);
        }

        return inputPath + '.decrypted';
    }

    static isEncryptedFile(filePath) {
        let fileDescriptor;

        try {
            const stats = fs.statSync(filePath);
            const headerLength = 1 + 64 + 16 + 16;
            if (!stats.isFile() || stats.size < headerLength) return false;

            fileDescriptor = fs.openSync(filePath, 'r');
            const saltLengthBuffer = Buffer.alloc(1);
            const bytesRead = fs.readSync(fileDescriptor, saltLengthBuffer, 0, 1, 0);
            return bytesRead === 1 && saltLengthBuffer[0] === 64;
        } catch {
            return false;
        } finally {
            if (fileDescriptor !== undefined) {
                fs.closeSync(fileDescriptor);
            }
        }
    }
}

async function encryptCLI(inputPath, key, options = {}) {
    const encryptor = new fileEncryptor(key);
    return encryptor.process(inputPath, 'encrypt', {
        outputPath: options.output,
        recursive: options.recursive,
        extension: options.extension,
        overwrite: options.overwrite,
        deleteSource: options.deleteSource
    });
}

async function decryptCLI(inputPath, key, options = {}) {
    const encryptor = new fileEncryptor(key);
    return encryptor.process(inputPath, 'decrypt', {
        outputPath: options.output,
        recursive: options.recursive,
        extension: options.extension,
        overwrite: options.overwrite,
        deleteSource: options.deleteSource
    });
}

module.exports = {
    encryptCLI,
    decryptCLI,
    isEncryptedFile: fileEncryptor.isEncryptedFile,
    SMALL_FILE_MAX_SIZE
};
