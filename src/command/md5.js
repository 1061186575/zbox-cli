const crypto = require('crypto');
const { question } = require("../utils");

async function main(options = {}) {
    let input
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

module.exports = main;
