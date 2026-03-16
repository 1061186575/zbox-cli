const { program } = require('commander');

// node ./bin/zbox -h
// npx zbox -h

require('./git');
require('./file');
require('./ke');


program
    .command('update')
    .option('-g, --global <global>', '是否全局安装 (true/false)',true)
    .option('-r, --register <register>', '指定源','https://registry.npmjs.org/')
    .description('更新 zbox-cli')
    .action((options) => {
        require('./command/updateZbox')(options)
    })


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
    .option('-b, --base64', '输出结果转为 base64', false)
    .option('-l, --length <length>', '输出长度', 32)
    .option('--content <content>')
    .option('--dot <dot>')
    .action(require('./command/md5'))

// 生成 TOTP 验证码
program
    .command('TOTP')
    .description('生成 TOTP 验证码')
    .option('--step <step>', '时间步长', 30)
    .option('--digits <digits>', '验证码长度', 6)
    .action(require('./command/TOTP'))

// 确定性密码生成器
program
    .command('generatePassword')
    .description('基于主密码和网站名称生成确定性密码')
    .option('--no-uppercase', '不包含大写字母')
    .option('--no-lowercase', '不包含小写字母')
    .option('--no-digits', '不包含数字')
    .option('--no-symbols', '不包含特殊字符')
    .option('--showEntropy', '显示密码强度分析', true)
    .option('-s, --site <site>', '网站/服务名称')
    .option('-m, --masterKey <masterKey>', '主密码')
    .option('--length <length>', '密码长度 (4-128)', '16')
    .option('--username <username>', '登录用户名/邮箱', '')
    .option('--pwdVersion <pwdVersion>', '密码版本号 (修改密码时递增即可)', '1')
    .action(require('./command/generatePassword'))
