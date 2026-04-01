const os = require("os");
const path = require("path");
const fs = require("fs");
const { program } = require('commander');

// 配置文件路径
const configPath = path.join(os.homedir(), '.zbox-cli-local-command.json');
// 默认的本地命令目录
const defaultLocalCommandDir = path.join(os.homedir(), '.zbox-cli-local-command');
let cmdLoadErrMsg = '';

/**
 * 读取配置文件，获取本地命令目录列表
 */
function getLocalCommandDirs() {
    let dirs = [];

    // 如果配置文件存在，读取配置的目录
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            dirs = config.dirs || [];
        } catch (error) {
            console.error('读取本地命令配置文件失败:', error.message);
        }
    }

    // 如果默认目录存在且不在配置中，添加默认目录
    if (fs.existsSync(defaultLocalCommandDir) && !dirs.includes(defaultLocalCommandDir)) {
        dirs.unshift(defaultLocalCommandDir);
    }

    return dirs.filter(dir => fs.existsSync(dir));
}

/**
 * 保存配置到文件
 */
function saveConfig(dirs) {
    try {
        const config = { dirs };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存配置文件失败:', error.message);
        return false;
    }
}

/**
 * 检查文件或文件夹是否可以作为命令
 */
function isValidCommand(filePath) {
    const stat = fs.statSync(filePath);

    if (stat.isFile() && filePath.endsWith('.js')) {
        return true;
    }

    if (stat.isDirectory()) {
        const indexPath = path.join(filePath, 'index.js');
        return fs.existsSync(indexPath) && fs.statSync(indexPath).isFile();
    }

    return false;
}

/**
 * 加载命令模块
 */
function loadCommand(filePath) {
    let modulePath = filePath;

    // 如果是目录，加载 index.js
    if (fs.statSync(filePath).isDirectory()) {
        modulePath = path.join(filePath, 'index.js');
    }

    return require(modulePath);
}

/**
 * 获取命令名称
 */
function getCommandName(filePath) {
    return path.parse(filePath).name;
}

// 创建 local 主命令
const local = program.command('local');
local.description('本地命令管理工具');

// local add 命令 - 添加本地命令目录
local.command('add')
    .description('添加本地命令目录')
    .argument('<dir>', '要添加的目录路径')
    .action((dir) => {
        const absolutePath = path.resolve(dir);

        if (!fs.existsSync(absolutePath)) {
            console.error(`目录不存在: ${absolutePath}`);
            return;
        }

        if (!fs.statSync(absolutePath).isDirectory()) {
            console.error(`不是一个目录: ${absolutePath}`);
            return;
        }

        const currentDirs = getLocalCommandDirs();

        if (currentDirs.includes(absolutePath)) {
            console.log(`目录已存在于配置中: ${absolutePath}`);
            return;
        }

        currentDirs.push(absolutePath);

        if (saveConfig(currentDirs)) {
            console.log(`成功添加目录: ${absolutePath}`);
        }
    });

// local delete 命令 - 删除本地命令目录
local.command('delete')
    .description('删除本地命令目录')
    .argument('<dir>', '要删除的目录路径')
    .action((dir) => {
        const absolutePath = path.resolve(dir);
        let currentDirs = getLocalCommandDirs();

        const index = currentDirs.indexOf(absolutePath);
        if (index === -1) {
            console.error(`目录不在配置中: ${absolutePath}`);
            return;
        }

        currentDirs.splice(index, 1);

        if (saveConfig(currentDirs)) {
            console.log(`成功从配置文件中移除目录: ${absolutePath}`);
        }
    });

// local list 命令 - 列出配置的目录
local.command('list')
    .description('列出所有配置的本地命令目录')
    .action(() => {
        console.log('配置文件路径:', configPath);
        const dirs = getLocalCommandDirs();
        if (dirs.length === 0) {
            console.log('没有配置任何可用的本地命令目录');
            return;
        }

        console.log('配置的本地命令目录:');
        dirs.forEach((dir, index) => {
            console.log(`  ${index + 1}. ${dir}`);
        });
    });

local.command('cmdLoadErrMsg')
    .description('列出加载错误的本地命令文件')
    .action(() => {
        console.log(cmdLoadErrMsg);
    });

// 获取模块里面的执行函数
function getMain(module, key = 'main') {
    if (typeof module === 'function') {
        return module;
    }
    const { mainName } = module;
    // 如果只导出一个就用这一个
    if (Object.keys(module).length === 1) {
        key = Object.keys(module)[0];
    }
    return module[mainName] || module[key];
}

// 扫描并注册本地命令
const localCommandDirs = getLocalCommandDirs();

if (localCommandDirs.length > 0) {
    localCommandDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            return;
        }

        let fileList;
        try {
            fileList = fs.readdirSync(dir);
        } catch (error) {
            console.error(`读取目录失败 ${dir}:`, error.message);
            return;
        }

        fileList.forEach(filename => {
            const filePath = path.join(dir, filename);

            if (!isValidCommand(filePath)) {
                return;
            }

            try {
                const module = loadCommand(filePath);
                /*
                module.exports = {
                    main,
                    cmdName: 'xxxCmd',
                    mainName: 'main',
                    description: 'description',
                    options: [
                        {
                            name: 'url',
                            desc: 'url 参数'
                        }
                    ],
                }
                 */
                let main = getMain(module);
                const { cmdName, description, options = [] } = module;

                if (typeof main !== 'function') {
                    cmdLoadErrMsg += `${filePath} 文件加载失败, 请导出 main 方法, 或者导出 mainName 指定 main 方法名称\n`
                    return;
                }

                const command = cmdName || getCommandName(filePath);
                const res = local
                    .command(command)
                    .description(description || '')
                    .action(cmdOptions => {
                        main(cmdOptions);
                    });

                // 添加选项
                options.forEach(item => {
                    res.option(`--${item.name} <${item.name}>`, item.desc || '');
                });
            } catch (error) {
                console.error(`加载本地命令失败 ${filePath}:`, error);
            }
        });
    });
}
