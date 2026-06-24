const os = require("os");
const path = require("path");
const fs = require("fs");
const { program } = require('commander');

// 配置文件路径
const configPath = path.join(os.homedir(), '.zbox-cli-local-command.json');
// 默认的本地命令目录
const defaultLocalCommandDir = path.join(os.homedir(), '.zbox-cli-local-command');
let cmdLoadErrMsg = '';

const localCommandTemplate = `// local-command.js
// 添加命令: zbox local add ./local-command.js
// 执行命令: zbox local hello --name Codex

function main(options) {
    console.log('hello', options.name);
}

module.exports = {
    // 必填: 命令执行入口。也可以直接 module.exports = main;
    main,

    // 可选: 自定义命令名称。默认使用文件名或目录名。
    cmdName: 'hello',

    // 可选: 命令说明，会展示在 zbox local --help 中。
    description: '输出一条问候语',

    // 可选: 指定入口函数名。未指定时默认读取 main。
    mainName: 'main',

    // 可选: 命令参数。每一项会注册为 --name <name> 形式。
    options: [
        {
            name: 'name',
            desc: '要问候的名字'
        }
    ]
};
`;

/**
 * 读取配置文件，获取本地命令目录和文件列表
 */
function getLocalCommandPaths() {
    let paths = [];

    // 如果配置文件存在，读取配置的目录和文件
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            paths = config.paths || [];
        } catch (error) {
            console.error('读取本地命令配置文件失败:', error.message);
        }
    }

    // 如果默认目录存在且不在配置中，添加默认目录
    if (fs.existsSync(defaultLocalCommandDir) && !paths.includes(defaultLocalCommandDir)) {
        paths.unshift(defaultLocalCommandDir);
    }

    return paths.filter(p => fs.existsSync(p));
}

/**
 * 保存配置到文件
 */
function saveConfig(paths) {
    try {
        const config = { paths };
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

/**
 * 获取路径下可用的命令文件
 */
function getCommandFiles(inputPath) {
    const stat = fs.statSync(inputPath);

    if (stat.isFile()) {
        return isValidCommand(inputPath) ? [inputPath] : [];
    }

    let fileList;
    try {
        fileList = fs.readdirSync(inputPath);
    } catch (error) {
        console.error(`读取目录失败 ${inputPath}:`, error.message);
        return [];
    }

    return fileList
        .map(filename => path.join(inputPath, filename))
        .filter(filePath => isValidCommand(filePath));
}

/**
 * 获取本地命令信息
 */
function getCommandInfo(filePath) {
    try {
        const module = loadCommand(filePath);
        const main = getMain(module);
        const { cmdName, description } = module;

        if (typeof main !== 'function') {
            return {
                error: '文件加载失败, 请导出 main 方法, 或者导出 mainName 指定 main 方法名称'
            };
        }

        return {
            command: cmdName || getCommandName(filePath),
            description: description || ''
        };
    } catch (error) {
        return {
            error: error.message
        };
    }
}

// 创建 local 主命令
const local = program.command('local');
local
    .description('管理与执行本地命令')
    .option('-p, --print', '打印本地命令文件模板')
    .action(options => {
        if (options.print) {
            console.log(localCommandTemplate);
            return;
        }

        local.outputHelp();
    });

// local add 命令 - 添加本地命令文件或目录
local.command('add')
    .description('添加本地命令文件或目录')
    .argument('<path>', '要添加的文件或目录路径')
    .action((inputPath) => {
        const absolutePath = path.resolve(inputPath);

        if (!fs.existsSync(absolutePath)) {
            console.error(`路径不存在: ${absolutePath}`);
            return;
        }

        const stat = fs.statSync(absolutePath);
        const isFile = stat.isFile();

        const currentPaths = getLocalCommandPaths();

        if (currentPaths.includes(absolutePath)) {
            console.log(`路径已存在于配置中: ${absolutePath}`);
            return;
        }

        currentPaths.push(absolutePath);

        if (saveConfig(currentPaths)) {
            const pathType = isFile ? '文件' : '目录';
            console.log(`成功添加${pathType}: ${absolutePath}`);
        }
    });

// local delete 命令 - 删除本地命令文件或目录
local.command('delete')
    .description('删除本地命令文件或目录')
    .argument('<path>', '要删除的文件或目录路径')
    .action((inputPath) => {
        const absolutePath = path.resolve(inputPath);
        let currentPaths = getLocalCommandPaths();

        const index = currentPaths.indexOf(absolutePath);
        if (index === -1) {
            console.error(`路径不在配置中: ${absolutePath}`);
            return;
        }

        currentPaths.splice(index, 1);

        if (saveConfig(currentPaths)) {
            console.log(`成功从配置文件中移除路径: ${absolutePath}`);
        }
    });

// local list 命令 - 列出配置的文件和目录
local.command('list')
    .description('列出所有配置的本地命令文件和目录')
    .action(() => {
        console.log('配置文件路径:', configPath);
        const paths = getLocalCommandPaths();
        if (paths.length === 0) {
            console.log('没有配置任何可用的本地命令文件或目录');
            return;
        }

        console.log('配置的本地命令文件和目录:');
        paths.forEach((pathItem, index) => {
            try {
                const stat = fs.statSync(pathItem);
                const type = stat.isFile() ? '[文件]' : '[目录]';
                console.log(`  ${index + 1}. ${type} ${pathItem}`);

                const commandFiles = getCommandFiles(pathItem);
                if (commandFiles.length === 0) {
                    console.log('     未发现可用命令');
                    return;
                }

                commandFiles.forEach(filePath => {
                    const info = getCommandInfo(filePath);
                    if (info.error) {
                        console.log(`     ${getCommandName(filePath)}: ${info.error}`);
                        return;
                    }

                    const description = info.description ? ` - ${info.description}` : '';
                    console.log(`     ${info.command}${description}`);
                });
            } catch (error) {
                console.log(`  ${index + 1}. [无效] ${pathItem}`);
            }
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
const localCommandDirs = getLocalCommandPaths();

if (localCommandDirs.length > 0) {
    localCommandDirs.forEach(p => {
        if (!fs.existsSync(p)) {
            return;
        }

        getCommandFiles(p).forEach(filePath => {
            loadCmd(filePath);
        });

        function loadCmd(filePath) {
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
        }
    });
}
