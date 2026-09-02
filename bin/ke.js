#!/usr/bin/env node

const pkg = require('../package.json');
const { program } = require('commander');
let fs = require('fs');
let path = require('path');
const readline = require('readline');


program
    .name('ke')
    .description('A collection of utility tools for file/git operations, and more')
    .version(pkg.version, '-v, -V, --version');

program
    .command('api')
    .description('通过 url 找到对应的 api 代码')
    .option('-u, --url <url>', '指定目标分支')
    .action(api);

program
    .command('rapi [uri]')
    .description('通过 api uri 找到对应的 action url')
    .option('-u, --url <url>', '指定 api uri')
    .action(rapi);


program.parse(process.argv);

// Display help by default if no command is provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}

function api(options) {
    let actions = 'server/src/actions'
    let apis = 'server/src/apis'

    function prompt(query) {
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

    function find(filepath) {
        let cwd = process.cwd();
        console.log(`cwd`, cwd);

        let src = path.join(cwd, actions, filepath + '.js')
        console.log(`api文件`, src);

        let content = fs.readFileSync(src, 'utf8')
        console.log(`content`, content);

        let matchRes = content.match(/API\.(\w+)\.(\w+)/)
        if (matchRes) {
            const [name, fileName, fnName] = matchRes
            console.log('找到的路径是', name);
            let apisFilepath = path.join(cwd, apis, fileName + '.js')
            let content2 = fs.readFileSync(apisFilepath, 'utf8')

            let reg = new RegExp(`api\\('${fnName}'[\\W\\w]+?}\\)`)
            let matchRes2 = content2.match(reg)
            console.log(`找到 api 代码:\n`, matchRes2?.[0].trim())
        }
    }

    let { url } = options;
    if (url) {
        find(url)
        return
    }
    prompt('请求的 url 是?\n').then(res => {
        find(res)
    })
}

function rapi(url, options) {
    let actions = 'server/src/actions'
    let apis = 'server/src/apis'

    function prompt(query) {
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

    function getFiles(directory) {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
            const itemPath = path.join(directory, item.name)
            return item.isDirectory() ? getFiles(itemPath) : [itemPath]
        })
    }

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    function find(targetUri) {
        const cwd = process.cwd()
        const apisDirectory = path.join(cwd, apis)
        const actionsDirectory = path.join(cwd, actions)
        const normalizedUri = targetUri.replace(/^\/+/, '')
        const apiReg = /api\(\s*(['"])([^'"]+)\1\s*,\s*\{[\W\w]*?\}\s*\)/g
        const matches = []

        getFiles(apisDirectory)
            .filter(filePath => path.extname(filePath) === '.js')
            .forEach(filePath => {
                const content = fs.readFileSync(filePath, 'utf8')
                let apiMatch
                while ((apiMatch = apiReg.exec(content))) {
                    const uriMatch = apiMatch[0].match(/uri\s*:\s*(['"])([^'"]+)\1/)
                    if (uriMatch?.[2].replace(/^\/+/, '') === normalizedUri) {
                        matches.push({
                            fileName: path.basename(filePath, '.js'),
                            fnName: apiMatch[2]
                        })
                    }
                }
            })

        const urls = new Set()
        const actionFiles = getFiles(actionsDirectory).filter(filePath => path.extname(filePath) === '.js')
        matches.forEach(({ fileName, fnName }) => {
            const apiPathReg = new RegExp(`API\\.${escapeRegExp(fileName)}\\.${escapeRegExp(fnName)}\\b`)
            actionFiles.forEach(filePath => {
                const content = fs.readFileSync(filePath, 'utf8')
                if (apiPathReg.test(content)) {
                    const relativePath = path.relative(actionsDirectory, filePath).replace(/\\/g, '/').replace(/\.js$/, '')
                    urls.add(`/${relativePath}`)
                }
            })
        })

        if (!urls.size) {
            console.log('未找到对应的前端 url')
            return
        }
        urls.forEach(url => console.log('找到前端 url:', url))
    }

    const targetUri = options.url || url
    if (targetUri) {
        find(targetUri)
        return
    }
    prompt('请求的 api url 是?\n').then(res => {
        find(res)
    })
}
