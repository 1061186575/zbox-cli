const readline = require("readline");
const os = require("os");
const { spawn } = require("child_process");

function question(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise(resolve => {
        rl.question(query, (str) => {
            resolve(str)
            rl.close();
        })
    })
}

/**
 * 安全的提问函数：输入时不显示字符
 */
function secretQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        // 先打印问题
        process.stdout.write(query);

        // 在 readline 的内部实现中临时“切断”输出流
        const oldWrite = rl._writeToOutput;
        rl._writeToOutput = function (stringToWrite) {
            // 如果是换行符则输出，否则屏蔽（这样就不会显示输入的密码了）
            if (stringToWrite === '\r\n' || stringToWrite === '\n') {
                oldWrite.call(rl, stringToWrite);
            } else if (stringToWrite.indexOf(query) !== -1) {
                // 允许打印问题本身
                oldWrite.call(rl, stringToWrite);
            }
            // 其他内容（即用户输入的字符）全部忽略，不往屏幕写
        };

        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

function spawnExec(commandStr, params = [], options = {}) {
    return new Promise((resolve, reject) => {
        // 合并默认配置和用户配置
        const defaultOptions = {
            stdio: 'inherit',
            shell: process.platform === 'win32', // Windows 平台使用 shell
            env: process.env, // 继承环境变量
            cwd: process.cwd() // 默认使用当前工作目录
        };

        const spawnOptions = { ...defaultOptions, ...options };

        try {
            const childProcess = spawn(commandStr, params, spawnOptions);

            // 处理错误事件
            childProcess.on('error', (err) => {
                reject(new Error(`执行命令失败: ${commandStr} ${params.join(' ')}\n错误: ${err.message}`));
            });

            // 处理进程退出
            childProcess.on('close', (code, signal) => {
                if (code === 0) {
                    resolve({
                        code,
                        signal,
                        success: true,
                        command: `${commandStr} ${params.join(' ')}`
                    });
                } else {
                    reject(new Error(`命令执行失败: ${commandStr} ${params.join(' ')}\n退出码: ${code}${signal ? `，信号: ${signal}` : ''}`));
                }
            });

            // 处理进程被终止的情况
            childProcess.on('exit', (code, signal) => {
                if (signal && signal !== 'SIGTERM') {
                    reject(new Error(`进程被信号终止: ${signal}`));
                }
            });

        } catch (error) {
            reject(new Error(`启动进程失败: ${error.message}`));
        }
    });
}

function getIps() {
    try {
        const interfaces = os.networkInterfaces();
        return Object.values(interfaces).flat().filter(d => d.family === 'IPv4' && d.address !== '127.0.0.1').map(d => d.address)
    } catch (e) {
        console.error(`err`, e);
    }
    return [];
}

function formatDateTime(input = new Date()) {
    const date = new Date(input);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
    question,
    secretQuestion,
    spawnExec,
    getIps,
    formatDateTime,
}
