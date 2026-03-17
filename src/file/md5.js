const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { question } = require('../utils');

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
async function main(filePath) {
    try {
        let targetPath = filePath;

        // 如果没有提供文件路径，提示用户输入
        if (!targetPath) {
            targetPath = await question('请输入文件路径: ');
            targetPath = targetPath.trim();
        }

        if (!targetPath) {
            console.log('❌ 文件路径不能为空');
            return;
        }

        // 支持相对路径和绝对路径
        const resolvedPath = path.resolve(targetPath);

        console.log(`📁 文件路径: ${resolvedPath}`);

        // 计算 MD5
        const md5Hash = await calculateFileMd5(resolvedPath);

        console.log(`✅ MD5: ${md5Hash}`);
        console.log(`📋 ${path.basename(resolvedPath)} - ${md5Hash}`);

        return md5Hash;

    } catch (error) {
        console.error(`❌ ${error.message}`);
        throw error;
    }
}

module.exports = main;