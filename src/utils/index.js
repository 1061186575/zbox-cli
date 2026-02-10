const readline = require("readline");
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


module.exports = {
    question,
    spawnExec,
}
