initConfig()

const path = require("path")
const fs = require("fs")
const { exec } = require('child_process')
const { start: startCopyFile, clearDist } = require('./copyToDist')
const { getGitCommit, prompt, spawnExec } = require("./utils")
const { saveFileMD5Change } = require("./calcFileMD5Changes");

function initConfig() {
    const path = require("path")
    global.workdir = process.cwd()
    console.log('workdir', workdir)
    process.chdir(path.join(__dirname))
    const argv2 = process.argv[2]
    let configPath = path.join(workdir, 'publishConfig.js')
    if (argv2.startsWith('--config=')) {
        let filepath = argv2.slice('--config='.length)
        configPath = path.join(workdir, filepath)
    }
    console.log('configPath', configPath)
    global.config = require(configPath)
}

const localDist = path.join(workdir, config.localDist)


async function start() {
    if (config.gitCommitCheck) {
        if (!await gitStatusCheck()) {
            let res = await prompt(`有代码未提交, 确定还要继续上传吗? (y/n)\n`)
            if (res !== 'y') {
                return
            }
        }
    }

    let copyRes = await startCopyFile(localDist)
    if (!copyRes) return

    if (config.versionFile) {
        writeVersion(config.versionFile)
    }

    uploadCloud()

}


function writeVersion(versionFile) {
    let writePath = path.join(localDist, versionFile)
    let writeDirPath = path.parse(writePath).dir
    if (!fs.existsSync(writeDirPath)) {
        fs.mkdirSync(writeDirPath, { recursive: true })
    }
    const { commitHash, commitDate } = getGitCommit()
    let content = JSON.stringify({
        buildTimestamp: new Date().getTime(),
        buildDate: new Date().toLocaleString(),
        commitHash,
        commitDate,
    }, null, 2)
    console.log('生成版本文件: ', writePath)
    console.log('版本信息: ', content)
    fs.writeFileSync(writePath, content)
}

function gitStatusCheck() {
    return new Promise((resolve, reject) => {
        exec('git status', function (err, result) {
            if (err) {
                reject(err)
                return
            }
            if (/Changes not staged for commit/i.test(result)) {
                console.log('执行git status:\n', result)
                clog('有代码未commit', 'err')
                resolve(false)
                return
            } else if (/Your branch is ([\w\W]+) commits/i.test(result)) {
                clog('有代码未push', 'warn')
                resolve(false)
                return
            }
            if (/nothing to commit, working tree clean/.test(result)) {
                resolve(true)
                return
            }
            clog(result, 'warn')
            resolve(false)
        })
    })
}

function uploadCloud() {

    const commandStr = `scp -r ${path.join(localDist, '/*')} ${config.remoteServerPath}` // 末尾的斜杠表示只复制目录中的内容，而不复制目录本身。
    console.log(`开始上传 ${localDist} 至服务器 ${config.remoteServerPath}`)
    console.log(commandStr)

    const commandArr = commandStr.split(' ')
    spawnExec(commandArr[0], commandArr.slice(1), (code) => {
        if (code === 0) {
            clog('上传完成!    ' + new Date().toLocaleString(), 'suc')
            clearDist(localDist)
            saveFileMD5Change()
        } else {
            clog('上传失败!', 'err')
        }
    })

}


function clog(str, type = '') {
    switch (type) {
        case "err":
            console.log('\033[31m' + str + ' \033[0m')
            break;
        case "warn":
            console.log('\033[33m' + str + ' \033[0m')
            break;
        case "suc":
            console.log('\033[42;30m DONE \033[40;32m ' + str + '\033[0m')
            break;
        default:
            console.log(str)
    }
}
