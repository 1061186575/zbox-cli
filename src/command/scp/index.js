const path = require("path")
const fs = require("fs")
const { exec } = require('child_process')
const { startCopyFile, clearDist, saveFileMD5Change } = require('./copyToDist')
const { getGitCommit, prompt, spawnExec } = require("./utils")

const workdir = process.cwd()
async function main(configFilePath, gitCommitCheck) {
    console.log('workdir', workdir)

    let configPath = path.join(workdir, configFilePath || 'publishConfig.js')
    console.log('configPath', configPath)

    if (!fs.existsSync(configPath)) {
        return clog('未找到配置文件', 'err')
    }

    const config = require(configPath)

    if (gitCommitCheck || config.gitCommitCheck) {
        if (!await gitStatusCheck(workdir)) {
            let res = await prompt(`有代码未提交, 确定还要继续上传吗? (y/n)\n`)
            if (res !== 'y') {
                return
            }
        }
    }

    const localDist = path.join(workdir, config.localDist)
    let copyRes = await startCopyFile(localDist, config)
    if (!copyRes) return

    if (config.versionFile) {
        writeVersion(config.versionFile, localDist)
    }

    uploadCloud(localDist, config)

}

function writeVersion(versionFile, localDist) {
    let writePath = path.join(localDist, versionFile)
    let writeDirPath = path.parse(writePath).dir
    if (!fs.existsSync(writeDirPath)) {
        fs.mkdirSync(writeDirPath, { recursive: true })
    }
    const { commitHash, commitDate } = getGitCommit(workdir)
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

function gitStatusCheck(workdir = process.cwd()) {
    return new Promise((resolve, reject) => {
        exec('git status', { cwd: workdir }, function (err, result) {
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

function uploadCloud(localDist, config) {

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

module.exports = main;
