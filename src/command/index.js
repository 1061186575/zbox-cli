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

