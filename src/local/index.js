const os = require("os");
const path = require("path");
const fs = require("fs");
const {program} = require('commander');

let localCommandPath = path.join(os.homedir(), '.zbox-cli-local-command')

if (fs.existsSync(localCommandPath) && fs.statSync(localCommandPath).isDirectory()) {
    const local = program.command('local');
    local.description('用 zbox 命令运行本地目录下的 node.js 文件');

    let fileList = fs.readdirSync(localCommandPath)
    fileList.forEach(filename => {
        if (!filename.endsWith('.js')) {
            return
        }
        let module = require(path.join(localCommandPath, filename))
        /*
        module.exports = {
            main,
            description: 'description',
            options: [
                {
                    key: 'url',
                    desc: 'url 参数'
                }
            ],
        }
         */
        let { description, options = [] } = module

        let res = local
            .command(path.parse(filename).name)
            .description(description || '')
            // .option('--url <url>', 'url option')
            .action(options => {
                let main
                if (typeof module === 'function') {
                    main = module
                } else {
                    let key = 'main' // 默认导出方法名称是 main
                    // 如果只导出一个就用这一个
                    if (Object.keys(module).length === 1) {
                        key = Object.keys(module)[0]
                    }
                    let cmdName = path.parse(filename).name
                    main = module[key] || module[cmdName]
                    if (typeof main !== 'function') {
                        console.error(`请在 ${filename} 文件里面导出 ${key} 或者 ${cmdName} 方法`)
                        return;
                    }
                }
                main(options)
            });
        options.forEach(item => {
            res.option(`--${item.key} <${item.key}>`, item.desc || '')
        })
    })
}
