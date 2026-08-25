const fs = require('fs');
const path = require('path');

const DEFAULT_CHUNK_SIZE = 1024 * 1024;

function createKeyBuffer(key = '') {
    // if (key === undefined || key === null || String(key).length === 0) {
    //     throw new Error('异或密钥不能为空');
    // }

    return Buffer.from(String(key), 'utf8');
}

function xorBuffer(buffer, key, keyOffset = 0) {
    for (let index = 0; index < buffer.length; index += 1) {
        buffer[index] ^= key[(keyOffset + index) % key.length];
    }

    return (keyOffset + buffer.length) % key.length;
}

async function xorFile(inputPath, outputPath, key, chunkSize = DEFAULT_CHUNK_SIZE) {
    const inputStats = await fs.promises.stat(inputPath);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    const temporaryPath = `${outputPath}.zbox-xor-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let keyOffset = 0;

    try {
        const input = fs.createReadStream(inputPath, { highWaterMark: chunkSize });
        const output = fs.createWriteStream(temporaryPath, { mode: inputStats.mode });

        await new Promise((resolve, reject) => {
            input.on('data', chunk => {
                keyOffset = xorBuffer(chunk, key, keyOffset);
                if (!output.write(chunk)) {
                    input.pause();
                    output.once('drain', () => input.resume());
                }
            });
            input.once('error', reject);
            output.once('error', reject);
            output.once('finish', resolve);
            input.once('end', () => output.end());
        });

        await fs.promises.chmod(temporaryPath, inputStats.mode);
        await fs.promises.rename(temporaryPath, outputPath);
    } catch (error) {
        await fs.promises.rm(temporaryPath, { force: true });
        throw error;
    }
}

async function getFiles(inputPath, recursive) {
    const stats = await fs.promises.stat(inputPath);
    if (stats.isFile()) return [inputPath];
    if (!stats.isDirectory()) throw new Error('输入路径必须是文件或目录');

    const files = [];
    const items = await fs.promises.readdir(inputPath, { withFileTypes: true });
    for (const item of items) {
        const itemPath = path.join(inputPath, item.name);
        if (item.isFile()) {
            files.push(itemPath);
        } else if (item.isDirectory() && recursive) {
            files.push(...await getFiles(itemPath, recursive));
        }
    }
    return files;
}

async function xor(inputPath, key, options = {}) {
    const keyBuffer = createKeyBuffer(key);
    const resolvedInputPath = path.resolve(inputPath);
    const recursive = options.recursive !== false;
    const inputStats = await fs.promises.stat(resolvedInputPath);
    const outputPath = options.output ? path.resolve(options.output) : resolvedInputPath;
    const files = await getFiles(resolvedInputPath, recursive);

    if (inputStats.isFile()) {
        if (outputPath !== resolvedInputPath && !options.overwrite) {
            try {
                await fs.promises.access(outputPath);
                throw new Error(`输出文件已存在: ${outputPath}，使用 --overwrite 参数覆盖`);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }
        await xorFile(resolvedInputPath, outputPath, keyBuffer);
        return [outputPath];
    }

    const outputFiles = [];
    for (const filePath of files) {
        const relativePath = path.relative(resolvedInputPath, filePath);
        const targetPath = path.join(outputPath, relativePath);
        if (targetPath !== filePath && !options.overwrite) {
            try {
                await fs.promises.access(targetPath);
                throw new Error(`输出文件已存在: ${targetPath}，使用 --overwrite 参数覆盖`);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }
        await xorFile(filePath, targetPath, keyBuffer);
        outputFiles.push(targetPath);
    }

    return outputFiles;
}

module.exports = {
    xor,
    xorBuffer,
    xorFile,
};
