const os = require('os');
const axios = require('axios');

// 默认配置
const defaultConfig = {
    port: 80,
    path: '/',
    timeout: 3000,
    concurrency: 20,
    customNetworks: []
};

// 获取本地网络接口信息
function getLocalNetworks() {
    const interfaces = os.networkInterfaces();
    const networks = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // 跳过内部地址和IPv6地址
            if (iface.family === 'IPv4' && !iface.internal) {
                const ip = iface.address;
                const netmask = iface.netmask;

                // 计算网络地址和广播地址
                const ipParts = ip.split('.').map(Number);
                const maskParts = netmask.split('.').map(Number);

                const networkParts = ipParts.map((part, i) => part & maskParts[i]);
                const network = networkParts.join('.');

                // 计算子网中的主机数量
                const hostBits = maskParts.reduce((bits, part) => bits + (8 - part.toString(2).split('1').length + 1), 0);
                const totalHosts = Math.pow(2, hostBits);

                networks.push({
                    interface: name,
                    network: network,
                    ip: ip,
                    netmask: netmask,
                    totalHosts: totalHosts
                });
            }
        }
    }

    return networks;
}

// 生成IP地址范围
function generateIPRange(network, totalHosts) {
    const networkParts = network.split('.').map(Number);
    const ips = [];

    // 对于常见的子网，生成所有可能的IP
    if (totalHosts <= 256) {
        const baseIP = networkParts.slice(0, 3).join('.');
        for (let i = 1; i < 255; i++) {
            ips.push(`${baseIP}.${i}`);
        }
    } else {
        console.log(`网络 ${network} 主机数量过大 (${totalHosts})，跳过扫描`);
    }

    return ips;
}

// 检查端口是否开放并验证服务
async function checkDevice(ip, port, path, timeout) {
    try {
        const response = await axios.get(`http://${ip}:${port}${path}`, {
            timeout: timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            },
            validateStatus: () => true // 接受所有状态码
        });

        return {
            ip: ip,
            port: port,
            path: path,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            accessible: true
        };
    } catch (error) {
        return {
            ip: ip,
            port: port,
            path: path,
            accessible: false,
            error: error.code === 'ECONNABORTED' ? 'Timeout' : error.message
        };
    }
}

// 并发扫描设备
async function scanDevices(ips, port, path, timeout, concurrency = 20) {
    const results = [];
    const foundDevices = [];

    console.log(`开始扫描 ${ips.length} 个IP地址...`);
    console.log(`目标端口: ${port}, 路径: ${path}`);
    console.log(`并发数: ${concurrency}`);
    console.log('');

    // 分批处理以控制并发
    for (let i = 0; i < ips.length; i += concurrency) {
        const batch = ips.slice(i, i + concurrency);
        const batchPromises = batch.map(ip => checkDevice(ip, port, path, timeout));

        try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // 找到可访问的设备
            const accessibleInBatch = batchResults.filter(result => result.accessible);
            if (accessibleInBatch.length > 0) {
                foundDevices.push(...accessibleInBatch);
                accessibleInBatch.forEach(device => {
                    console.log(`✅ 找到设备: http://${device.ip}:${device.port}${device.path}`);
                    console.log(`   状态: ${device.status} ${device.statusText}`);
                    if (device.headers.server) {
                        console.log(`   服务器: ${device.headers.server}`);
                    }
                    console.log('');
                });
            }

            // 显示进度
            const progress = Math.min(i + concurrency, ips.length);
            console.log(`进度: ${progress}/${ips.length} (${Math.round(progress/ips.length*100)}%)`);
        } catch (error) {
            console.error(`批次处理错误:`, error);
        }
    }

    return { results, foundDevices };
}

// 主函数
async function main(options = {}) {
    const config = { ...defaultConfig, ...options };
    let allFoundDevices = [];

    console.log('🔍 网络设备发现工具');
    console.log('====================');
    console.log('');

    console.log(`扫描参数:`);
    console.log(`  端口: ${config.port}`);
    console.log(`  路径: ${config.path}`);
    console.log(`  并发数: ${config.concurrency}`);
    console.log(`  超时时间: ${config.timeout}ms`);
    console.log('');

    // 获取网络列表
    let networks = [];
    if (config.customNetworks && config.customNetworks.length > 0) {
        console.log(`使用自定义网络:`);
        networks = config.customNetworks;
    } else {
        console.log(`自动获取本地网络...`);
        networks = getLocalNetworks();
    }

    if (networks.length === 0) {
        console.log('❌ 未找到可用的网络接口');
        return { foundDevices: [] };
    }

    console.log(`发现 ${networks.length} 个网络接口:`);
    networks.forEach(network => {
        console.log(`  - ${network.interface}: ${network.network} (${network.ip}/${network.netmask})`);
    });
    console.log('');

    // 设置中断处理
    let interrupted = false;
    const handleInterrupt = () => {
        interrupted = true;
        console.log('\n\n⏹️  扫描已中断');
        if (allFoundDevices.length > 0) {
            console.log(`已找到 ${allFoundDevices.length} 台设备:`);
            allFoundDevices.forEach((device, index) => {
                console.log(`${index + 1}. http://${device.ip}:${device.port}${device.path}`);
            });
        }
    };

    process.on('SIGINT', handleInterrupt);
    process.on('SIGTERM', handleInterrupt);

    try {
        // 扫描所有网络
        for (const network of networks) {
            if (interrupted) break;

            console.log(`扫描网络: ${network.network} (接口: ${network.interface})`);
            console.log('----------------------------------------');

            const ips = generateIPRange(network.network, network.totalHosts);
            if (ips.length === 0) {
                console.log('跳过此网络');
                console.log('');
                continue;
            }

            const { foundDevices } = await scanDevices(ips, config.port, config.path, config.timeout, config.concurrency);
            allFoundDevices.push(...foundDevices);

            console.log('----------------------------------------');
            console.log('');
        }

        // 总结结果
        if (!interrupted) {
            console.log('📊 扫描完成');
            console.log('=============');

            if (allFoundDevices.length === 0) {
                console.log('❌ 未找到运行指定服务的设备');
                console.log('');
                console.log('建议:');
                console.log('  1. 确认目标设备已开机并连接到网络');
                console.log(`  2. 确认目标设备的 ${config.port} 端口已开放`);
                console.log(`  3. 确认目标设备在 ${config.path} 路径下有服务运行`);
                console.log('  4. 检查防火墙设置');
            } else {
                console.log(`✅ 找到 ${allFoundDevices.length} 台设备:`);
                console.log('');

                allFoundDevices.forEach((device, index) => {
                    console.log(`${index + 1}. http://${device.ip}:${device.port}${device.path}`);
                    console.log(`   HTTP状态: ${device.status} ${device.statusText}`);
                    if (device.headers['content-type']) {
                        console.log(`   内容类型: ${device.headers['content-type']}`);
                    }
                    if (device.headers.server) {
                        console.log(`   服务器: ${device.headers.server}`);
                    }
                    console.log('');
                });
            }
        }
    } catch (error) {
        console.error('扫描过程中发生错误:', error);
    } finally {
        // 移除事件监听器
        process.removeListener('SIGINT', handleInterrupt);
        process.removeListener('SIGTERM', handleInterrupt);
    }

    return { foundDevices: allFoundDevices };
}

module.exports = main;
