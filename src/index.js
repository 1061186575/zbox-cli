const { program } = require('commander');

// alias b='node ./bin/zbox'

require('./git');
require('./ke');
require('./file');

// 启动一个 Node.js http 服务
program
    .command('http')
    .option('-p, --port <port>', '指定端口号', '3000')
    .option('-s, --response <response>', '指定返回的响应体')
    .description('启动 Node.js http 服务')
    .action((options) => {
        require('./command/http')(options.port, options.response)
    })

// 网络设备发现工具
program
    .command('findDevice')
    .option('-p, --port <port>', '目标端口号', '80')
    .option('--path <path>', '目标路径', '/')
    .option('-t, --timeout <timeout>', '请求超时时间(毫秒)', '3000')
    .option('-c, --concurrency <concurrency>', '并发扫描数量', '20')
    .option('--customNetworks <networks>', '自定义网络列表 (JSON格式)')
    .description('扫描本地网络中运行指定服务的设备')
    .action(require('./command/findDevice'))


// MD5 哈希计算工具
program
    .command('md5')
    .description('计算输入内容的 MD5 哈希值')
    .option('-i, --iteration <iteration>', '迭代次数', 1)
    .option('-l, --length <length>', '输出长度', 32)
    .option('-b, --base64', '输出结果转为 base64', false)
    .option('--content <content>')
    .action(require('./command/md5'))
