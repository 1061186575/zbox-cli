const crypto = require('crypto');
const { question } = require("../utils");

/**
 * 确定性安全密码生成器
 * 基于固定输入生成相同密码，使用PBKDF2确保无法逆向推导
 */

// 字符集定义
const CHAR_SETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

function generateDeterministicPassword(masterKey, site, options = {}) {
    const {
        length = 16,
        username,
        pwdVersion,
        includeUppercase = true,
        includeLowercase = true,
        includeDigits = true,
        includeSymbols = true,
        iterations = 100000 // PBKDF2 迭代次数
    } = options;

    // 参数验证
    if (length < 4 || length > 128) {
        throw new Error('密码长度必须在 4-128 之间');
    }

    if (!includeUppercase && !includeLowercase && !includeDigits && !includeSymbols) {
        throw new Error('至少需要包含一种字符类型');
    }

    // 构建字符集
    let charset = '';
    const requiredTypes = [];

    if (includeLowercase) {
        charset += CHAR_SETS.lowercase;
        requiredTypes.push('lowercase');
    }
    if (includeUppercase) {
        charset += CHAR_SETS.uppercase;
        requiredTypes.push('uppercase');
    }
    if (includeDigits) {
        charset += CHAR_SETS.digits;
        requiredTypes.push('digits');
    }
    if (includeSymbols) {
        charset += CHAR_SETS.symbols;
        requiredTypes.push('symbols');
    }

    // 使用 PBKDF2 基于主密码和网站名称生成确定性的随机种子
    const salt = Buffer.from(`${site}-${username}-${pwdVersion}`, 'utf8');
    const derivedKey = crypto.pbkdf2Sync(masterKey, salt, iterations, length * 2, 'sha256');

    console.log(`derivedKey`, derivedKey.toString('base64'));

    return generatePasswordFromSeed(derivedKey, charset, length, requiredTypes);
}

function generatePasswordFromSeed(seed, charset, length, requiredTypes) {
    let password = '';

    // 确保包含每种必需的字符类型
    const requiredChars = [];
    requiredTypes.forEach((type, index) => {
        const typeCharset = CHAR_SETS[type];
        const charIndex = seed[index] % typeCharset.length;
        requiredChars.push(typeCharset[charIndex]);
    });

    // 添加必需字符
    requiredChars.forEach(char => {
        password += char;
    });

    // 填充剩余长度
    for (let i = requiredChars.length; i < length; i++) {
        const charIndex = seed[i] % charset.length;
        password += charset[charIndex];
    }

    // 使用种子确定性地打乱密码
    return deterministicShuffle(password.split(''), seed).join('');
}

function deterministicShuffle(array, seed) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        // 使用种子的不同字节来确定交换位置
        const j = seed[i % seed.length] % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function calculateEntropy(charset, length) {
    // 计算密码熵：log2(字符集大小^密码长度)
    return Math.log2(Math.pow(charset.length, length));
}

function getStrengthLevel(entropy) {
    if (entropy < 30) return '弱';
    if (entropy < 50) return '中等';
    if (entropy < 70) return '强';
    return '非常强';
}

async function main(options = {}) {
    try {
        const {
            uppercase = true,
            lowercase = true,
            digits = true,
            symbols = true,
            showEntropy = false,
            site = null,
            masterKey = null,
            length: lengthStr = '16',
            username = '',
            pwdVersion: pwdVersionStr = '1',
        } = options;

        const length = parseInt(lengthStr);
        const pwdVersion = parseInt(pwdVersionStr);

        if (isNaN(length)) {
            console.error('参数错误：长度必须是数字');
            return;
        }
        if (isNaN(pwdVersion)) {
            console.error('参数错误：密码版本必须是数字');
            return;
        }

        let actualMasterKey = masterKey;
        let actualSite = site;

        // 如果没有提供网站名称，提示输入
        if (!actualSite) {
            actualSite = (await question('请输入网站/服务名称: ')).trim();
            if (!actualSite.trim()) {
                console.error('网站/服务名称不能为空');
                return;
            }
        }

        // 如果没有提供主密码，提示输入
        if (!actualMasterKey) {
            actualMasterKey = (await question('请输入主密码: ')).trim();
            if (!actualMasterKey) {
                console.error('主密码不能为空');
                return;
            }
        }

        // 生成确定性密码
        const password = generateDeterministicPassword(actualMasterKey, actualSite, {
            length,
            username,
            pwdVersion,
            includeUppercase: uppercase !== false,
            includeLowercase: lowercase !== false,
            includeDigits: digits !== false,
            includeSymbols: symbols !== false
        });

        console.log('\n🔐 密码生成完成：', password);

        if (showEntropy) {
            // 计算并显示密码强度
            let charset = '';
            if (lowercase !== false) charset += CHAR_SETS.lowercase;
            if (uppercase !== false) charset += CHAR_SETS.uppercase;
            if (digits !== false) charset += CHAR_SETS.digits;
            if (symbols !== false) charset += CHAR_SETS.symbols;

            const entropy = calculateEntropy(charset, length);
            const strength = getStrengthLevel(entropy);

            console.log(`\n📊 密码强度分析:`);
            console.log(`   字符集大小: ${charset.length}`);
            console.log(`   密码长度: ${length}`);
            console.log(`   熵值: ${entropy.toFixed(1)} bits`);
            console.log(`   强度等级: ${strength}`);
        }

        console.log('\n✅ 使用 PBKDF2 算法生成，无法逆向推导');

    } catch (error) {
        console.error('❌ 密码生成失败:', error.message);
    }
}

module.exports = main;
