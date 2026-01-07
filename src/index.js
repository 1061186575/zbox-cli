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

