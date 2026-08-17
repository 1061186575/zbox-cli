const { program } = require('commander');
const { question, secretQuestion } = require("../utils");

const crypto = program.command('crypto');

crypto.description('执行文本加解密操作');

// 确定性密码生成器
// 生成 6 位数的纯数字密码示例: zbox generatePassword --no-uppercase --no-lowercase --no-symbols --length 6
crypto
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
crypto
    .command('encrypt')
    .description('加密字符串')
    .option('-t, --text <text>', '要加密的字符串')
    .option('-k, --key <key>', '加密密钥')
    .action(async (options) => {
        const { encryptStringCLI } = require('./stringEncryptor');

        try {
            const text = options.text || (await question('请输入要加密的字符串: ')).trim();
            const key = options.key || (await secretQuestion('请输入加密密钥(输入时不显示): ')).trim();

            await encryptStringCLI(text, key, { allowWriteFile: true });
        } catch (error) {
            console.error('❌ 加密失败:', error.message);
        }
    })


// 字符串解密工具
crypto
    .command('decrypt')
    .description('解密字符串')
    .option('-t, --text <text>', '要解密的字符串')
    .option('-k, --key <key>', '解密密钥')
    .action(async (options) => {
        const { decryptStringCLI } = require('./stringEncryptor');

        try {
            const text = options.text || (await question('请输入要解密的字符串: ')).trim();
            const key = options.key || (await secretQuestion('请输入解密密钥(输入时不显示): ')).trim();

            await decryptStringCLI(text, key, { allowWriteFile: true });
        } catch (error) {
            console.error('❌ 解密失败:', error.message);
        }
    })

// 生成 TOTP 验证码
crypto
    .command('totp')
    .description('生成 TOTP 验证码')
    .option('--step <step>', '时间步长', 30)
    .option('--digits <digits>', '验证码长度', 6)
    .action(require('./totp'))
