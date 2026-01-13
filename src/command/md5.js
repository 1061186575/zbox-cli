const crypto = require('crypto');
const { question } = require("../utils");

async function main(options) {
    const input = (await question('请输入要计算 MD5 的内容: ')).trim();
    if (!input) return;
    const md5Hash = crypto.createHash('md5').update(input).digest('hex');
    if (options.length) {
        console.log(`MD5 前面 ${options.length} 位哈希值: ${md5Hash.substring(0, parseInt(options.length))}`);
        return;
    }
    console.log(`MD5 哈希值: ${md5Hash}`);
}

module.exports = main;
