let fs = require('fs');
let path = require('path');
const readline = require('readline');

/**
 * 通过 url 找到对应的 api 代码
 */

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
        console.log(`找到 api 代码:\n`, matchRes2?.[0].trim());
    }
}

function main(url) {
    if (url) {
        find(url)
        return
    }
    prompt('前端 url 路径是?\n').then(res => {
        find(res)
    })
}

module.exports = main
