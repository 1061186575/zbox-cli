const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function calculateFileSha256(filePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            reject(new Error(`文件不存在: ${filePath}`));
            return;
        }

        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            reject(new Error(`路径不是一个文件: ${filePath}`));
            return;
        }

        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', chunk => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', error => {
            reject(new Error(`读取文件时发生错误: ${error.message}`));
        });
    });
}

async function fileSha256(filePathOrPaths) {
    const filePaths = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];

    if (filePaths.length === 0 || !filePaths[0]) {
        throw new Error('文件路径不能为空');
    }

    const hashes = await Promise.all(filePaths.map(filePath => fileSha256Single(filePath)));
    return Array.isArray(filePathOrPaths) ? hashes : hashes[0];
}

async function fileSha256Single(filePath) {
    try {
        const resolvedPath = path.resolve(filePath);
        const sha256Hash = await calculateFileSha256(resolvedPath);

        console.log(`${path.basename(resolvedPath)} ✅ SHA-256:  ${sha256Hash}`);

        return sha256Hash;
    } catch (error) {
        console.error(`❌ ${error.message}`);
        throw error;
    }
}

module.exports = {
    calculateFileSha256,
    fileSha256
};
