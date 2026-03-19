const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { question } = require("../utils");

async function main(filePath, options = {}) {
    if (filePath) {
        return await fileMd5(filePath);
    }
    if (options.filePath) {
        // 如果没有提供文件路径，提示用户输入
        if (options.filePath === true) {
            filePath = await question('请输入文件路径: ');
            filePath = filePath.trim();
        } else {
            filePath = options.filePath;
        }
        return await fileMd5(filePath);
    }
    return await textMd5(options);
}

async function textMd5(options) {
    let input;
    if (options.content) {
        input = options.content;
    } else {
        input = (await question('请输入内容: ')).trim();
    }

    const iteration = Math.max(parseInt(options.iteration), 1);
    const length = Math.min(parseInt(options.length), 32);
    const isBase64 = options.base64;

    // 输入内容验证
    if (!input) return;
    if (isNaN(iteration) || isNaN(length) || typeof isBase64 !== 'boolean') {
        console.error('参数错误');
        return;
    }

    let md5Hash = input;
    for (let i = 0; i < iteration; i++) {
        md5Hash = crypto.createHash('md5').update(md5Hash).digest('hex');
    }

    const logs = [];
    if (iteration > 1) {
        logs.push(`迭代 ${iteration} 次,`);
    }
    if (isBase64) {
        logs.push(`转为 base64,`);
        md5Hash = Buffer.from(md5Hash).toString('base64')
    }
    if (length < 32) {
        logs.push(`前面 ${length} 位,`);
        md5Hash = md5Hash.substring(0, length)
    }
    if (iteration > 1 && isBase64 && length < 32) {
        logs.unshift('OK!')
    }
    console.log(...logs, `MD5 哈希值: ${md5Hash}`);
    return md5Hash;
}


/**
 * 计算文件的 MD5 值，支持大文件流式处理
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} MD5 hash 值
 */
function calculateFileMd5(filePath) {
    return new Promise((resolve, reject) => {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`文件不存在: ${filePath}`));
        }

        // 检查是否为文件（不是目录）
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            return reject(new Error(`路径不是一个文件: ${filePath}`));
        }

        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        // 处理文件大小显示
        const fileSize = stats.size;
        const fileSizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
        console.log(`正在计算文件 MD5: ${path.basename(filePath)} (${fileSizeInMB} MB)`);

        let processedBytes = 0;
        let lastProgress = 0;

        stream.on('data', (chunk) => {
            hash.update(chunk);
            processedBytes += chunk.length;

            // 显示进度（每 10% 显示一次）
            const progress = Math.floor((processedBytes / fileSize) * 100);
            if (progress >= lastProgress + 10) {
                console.log(`进度: ${progress}%`);
                lastProgress = progress;
            }
        });

        stream.on('end', () => {
            const md5Hash = hash.digest('hex');
            console.log('计算完成！');
            resolve(md5Hash);
        });

        stream.on('error', (err) => {
            reject(new Error(`读取文件时发生错误: ${err.message}`));
        });
    });
}

/**
 * MD5 命令主函数
 * @param {string} filePath - 可选的文件路径参数
 */
async function fileMd5(filePath) {
    try {
        if (!filePath) {
            console.log('❌ 文件路径不能为空');
            return;
        }

        // 支持相对路径和绝对路径
        const resolvedPath = path.resolve(filePath);

        console.log(`📁 文件路径: ${resolvedPath}`);

        // 计算 MD5
        const md5Hash = await calculateFileMd5(resolvedPath);

        console.log(`✅ MD5: ${md5Hash}`);
        console.log(`📋 ${path.basename(resolvedPath)} - ${md5Hash}`);

        return md5Hash;

    } catch (error) {
        console.error(`❌ ${error.message}`);
    }
}

module.exports = {
    main,
    textMd5,
    fileMd5,
};
