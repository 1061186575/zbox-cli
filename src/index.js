const { program } = require('commander');
const path = require('path');
const { readFileSync } = require('fs');

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

// scp 复制文件到服务器
program
    .command('scp')
    .option('-c, --config <configPath>', '指定配置文件路径', './publishConfig.js')
    .option('-g, --gitCommitCheck', '上传之前检查 git commit 状态', false)
    .option('-p, --printDemoConfig', '打印配置示例')
    .description('使用 scp 命令复制文件到服务器\n1.支持增量上传\n2.支持上传前检查 git 状态')
    .action(options => {
        if (options.printDemoConfig) {
            const demoConfigPath = path.join(__dirname, './command/scp/demo/publishConfig.js')
            console.log('demoConfigPath', demoConfigPath);
            console.log(readFileSync(demoConfigPath, 'utf8'));
            return;
        }
        const scpMain = require('./command/scp/index')
        scpMain(options.config, options.gitCommitCheck)
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
        const config = {
            port: parseInt(options.port),
            path: options.path,
            timeout: parseInt(options.timeout),
            concurrency: parseInt(options.concurrency)
        };

        // 处理自定义网络
        if (options.customNetworks) {
            try {
                config.customNetworks = JSON.parse(options.customNetworks);
            } catch (error) {
                console.error('自定义网络参数格式错误，请使用有效的 JSON 格式');
                console.error('示例: --customNetworks \'[{"interface":"en0","network":"192.168.1.0","ip":"192.168.1.100","netmask":"255.255.255.0","totalHosts":256}]\'');
                process.exit(1);
            }
        }

        try {
            await findDevice(config);
        } catch (error) {
            console.error('findDevice 执行失败:', error.message);
            process.exit(1);
        }
    })

