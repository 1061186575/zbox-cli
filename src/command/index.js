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


// MD5 哈希计算工具
program
    .command('md5 [filePath]')
    .description('计算输入内容的 MD5 哈希值')
    .option('-i, --iteration <iteration>', '迭代次数', 1)
    .option('-b, --base64', '输出结果转为 base64', false)
    .option('-l, --length <length>', '输出长度', 32)
    .option('--content <content>', '指定要计算的 md5 字符串')
    .option('--filePath [filePath]', '指定文件路径, 用于计算文件的 MD5 值，支持超大文件, 如果没给参数值会要求输入文件路径')
    .action(require('./md5').main)


// 生成 TOTP 验证码
program
    .command('TOTP')
    .description('生成 TOTP 验证码')
    .option('--step <step>', '时间步长', 30)
    .option('--digits <digits>', '验证码长度', 6)
    .action(require('./TOTP'))


// 生成二维码
program
    .command('qrcode')
    .description('生成二维码')
    .option('-t, --text <text>', '二维码内容')
    .option('-o, --output <output>', '输出图片路径')
    .option('-m, --multiline', '多行输入二维码内容')
    .action(require('./qrcode'))


// 确定性密码生成器
// 生成 6 位数的纯数字密码示例: zbox generatePassword --no-uppercase --no-lowercase --no-symbols --length 6
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
    .action(require('./generatePassword'))


// 字符串加密工具
program
    .command('encrypt')
    .description('加密字符串')
    .option('-t, --text <text>', '要加密的字符串')
    .option('-k, --key <key>', '加密密钥')
    .action(async (options) => {
        const { encryptStringCLI } = require('./stringEncryptor');

        try {
            const text = options.text || (await question('请输入要加密的字符串: ')).trim();
            const key = options.key || (await secretQuestion('请输入加密密钥(输入时不显示): ')).trim();

            await encryptStringCLI(text, key);
        } catch (error) {
            console.error('❌ 加密失败:', error.message);
        }
    })


// 字符串解密工具
program
    .command('decrypt')
    .description('解密字符串')
    .option('-t, --text <text>', '要解密的字符串')
    .option('-k, --key <key>', '解密密钥')
    .action(async (options) => {
        const { decryptStringCLI } = require('./stringEncryptor');

        try {
            const text = options.text || (await question('请输入要解密的字符串: ')).trim();
            const key = options.key || (await secretQuestion('请输入解密密钥(输入时不显示): ')).trim();

            await decryptStringCLI(text, key);
        } catch (error) {
            console.error('❌ 解密失败:', error.message);
        }
    })


// 扫描局域网设备
program
    .command('scanDevice')
    .description('扫描局域网设备')
    .option('-p, --ports <ports>', '扫描的端口号，传入多个用逗号分隔', '80,3000,8080')
    .option('--prefix <prefix>', '扫码网络号 / 子网 (如: 192.168.10)，传入多个用逗号分隔，不传则自动获取')
    .option('--more', '扫描地址块 / 网段前缀 (192.168.0.0/16)', false)
    .action(require('./scanDevice'))
