const { program } = require('commander');
const crypto = require('crypto');
const { question } = require("./utils");

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
    .action(async (options) => {
        const findDevice = require('./command/findDevice');
        await findDevice({
            port: parseInt(options.port),
            path: options.path,
            timeout: parseInt(options.timeout),
            concurrency: parseInt(options.concurrency)
        });
    })


// MD5 哈希计算工具
program
    .command('md5')
    .description('计算输入内容的 MD5 哈希值')
    .option('-l, --length <length>', '输出长度', 10)
    .action(async (options) => {
        const input = (await question('请输入要计算 MD5 的内容: ')).trim();
        if (!input) return;
        const md5Hash = crypto.createHash('md5').update(input).digest('hex');
        if (options.length) {
            console.log(`MD5 前面 ${options.length} 位哈希值: ${md5Hash.substring(0, parseInt(options.length))}`);
            return;
        }
        console.log(`MD5 哈希值: ${md5Hash}`);
    })
