const { program } = require('commander');
const { question, secretQuestion } = require("../utils");

// 更新 zbox-cli
program
    .command('update')
    .option('-g, --global <global>', '是否全局安装 (true/false)',true)
    .option('-r, --register <register>', '指定源','https://registry.npmjs.org/')
    .description('更新 zbox-cli')
    .action((options) => {
        require('./updateZbox')(options)
    })

// 生成二维码
program
    .command('qrcode')
    .description('生成二维码')
    .option('-t, --text <text>', '二维码内容')
    .option('-o, --output <output>', '输出图片路径')
    .option('-m, --multiline', '多行输入二维码内容')
    .action(require('./qrcode'))


// MD5 哈希计算工具
program
    .command('md5 [filePath]')
    .description('计算输入内容或指定文件的 MD5')
    .option('-i, --iteration <iteration>', '迭代次数', 1)
    .option('-b, --base64', '输出结果转为 base64', false)
    .option('-l, --length <length>', '输出长度', 32)
    .option('--content <content>', '指定要计算的 md5 字符串')
    .option('--filePath [filePath]', '指定文件路径, 用于计算文件的 MD5 值，支持超大文件, 如果没给参数值会要求输入文件路径')
    .action(require('./md5').main)
