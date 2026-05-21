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


// 启动一个 Node.js http 服务
program
    .command('http')
    .option('-p, --port <port>', '指定端口号', '3000')
    .option('-s, --response <response>', '指定返回的响应体')
    .description('启动 Node.js http 服务')
    .action((options) => {
        require('./http')(options.port, options.response)
    })



// 生成二维码
program
    .command('qrcode')
    .description('生成二维码')
    .option('-t, --text <text>', '二维码内容')
    .option('-o, --output <output>', '输出图片路径')
    .option('-m, --multiline', '多行输入二维码内容')
    .action(require('./qrcode'))



// 扫描局域网设备
program
    .command('scanDevice')
    .description('扫描局域网设备')
    .option('-p, --ports <ports>', '扫描的端口号，传入多个用逗号分隔', '80,3000,8080')
    .option('--prefix <prefix>', '扫码网络号 / 子网 (如: 192.168.10)，传入多个用逗号分隔，不传则自动获取')
    .option('--more', '扫描地址块 / 网段前缀 (192.168.0.0/16)', false)
    .action(require('./scanDevice'))
