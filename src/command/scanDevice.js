const os = require('os');
const axios = require('axios');

function getAllLocalIPPrefixes() {
    const interfaces = os.networkInterfaces();
    const prefixes = [];

    for (let devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            // 过滤：IPv4、非回环、非虚拟机的简单识别（可选）
            if (alias.family === 'IPv4' && !alias.internal) {
                const parts = alias.address.split('.');
                if (parts.length === 4) {
                    const prefix = parts.slice(0, 3).join('.');
                    // 避免重复（同一个网段可能有多个别名）
                    if (!prefixes.includes(prefix)) {
                        prefixes.push(prefix);
                    }
                }
            }
        }
    }
    return prefixes;
}

async function checkDevice(ip, port) {
    try {
        await axios.get(`http://${ip}:${port}`, { timeout: 2000 });
        console.log(`[找到设备] http://${ip}:${port}`);
        return { ip, port };
    } catch (e) {
        return null;
    }
}

async function startScan() {
    const prefixes = getAllLocalIPPrefixes();
    const ports = [80, 8080, 3000];

    console.log(`检测到以下网段: ${prefixes.join(', ')}`);

    for (const prefix of prefixes) {
        console.log(`\n正在扫描网段: ${prefix}.xx ...`);

        // 为了防止并发请求过多导致系统崩溃，建议分批或控制并发
        const tasks = [];
        for (let i = 1; i <= 254; i++) {
            const ip = `${prefix}.${i}`;
            for (const port of ports) {
                tasks.push(checkDevice(ip, port));
            }
        }

        // 建议分段执行，或者直接使用 Promise.all
        // 注意：一次性推入上千个请求可能会被系统防火墙拦截
        await Promise.all(tasks);
    }
    console.log('\n所有网段扫描完成。');
}

async function startMoreScan() {
    const prefixes = getAllLocalIPPrefixes();
    const ports = [80, 8080, 3000];

    for (let prefix of prefixes) {
        let arr = prefix.split('.')
        arr.pop()
        prefix = arr.join('.')
        for (let i = 1; i <= 254; i++) {
            console.log(`正在扫描网段: ${prefix}.${i}.xx ...`);

            // 为了防止并发请求过多导致系统崩溃，建议分批或控制并发
            const tasks = [];
            for (let j = 1; j <= 254; j++) {
                const ip = `${prefix}.${i}.${j}`;
                for (const port of ports) {
                    tasks.push(checkDevice(ip, port));
                }
            }

            // 建议分段执行，或者直接使用 Promise.all
            // 注意：一次性推入上千个请求可能会被系统防火墙拦截
            await Promise.all(tasks);
        }
    }
    console.log('\n所有网段扫描完成。');
}

startMoreScan();
