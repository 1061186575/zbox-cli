const { program } = require('commander');

const network = program.command('network');

network.description('网络服务');

// 启动一个 Node.js http 服务
network
    .command('http')
    .option('-p, --port <port>', '指定端口号', '3000')
    .option('-s, --response <response>', '指定返回的响应体')
    .description('启动 Node.js http 服务')
    .action((options) => {
        require('./http')(options.port, options.response)
    })

// 启动一个临时文本保存服务
network
    .command('text')
    .option('-p, --port <port>', '指定端口号', '3000')
    .description('启动临时文本保存服务')
    .action((options) => {
        require('./text')(options.port)
    })


// 扫描局域网设备
network
    .command('scanDevice')
    .description('扫描局域网设备')
    .option('-p, --ports <ports>', '扫描的端口号，传入多个用逗号分隔', '80,3000,8080')
    .option('--prefix <prefix>', '扫码网络号 / 子网 (如: 192.168.10)，传入多个用逗号分隔，不传则自动获取')
    .option('--more', '扫描地址块 / 网段前缀 (192.168.0.0/16)', false)
    .action(require('./scanDevice'))
