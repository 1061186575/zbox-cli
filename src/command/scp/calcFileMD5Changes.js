const fs = require('fs')
const crypto = require('crypto')
const path = require("path");

// 如果 md5CacheFile 配置不存在就每次都上传所有文件
const md5CacheFile = config.md5CacheFile ? path.join(workdir, config.md5CacheFile) : false

console.log('md5CacheFile', md5CacheFile)

let md5Cache = {}
if (md5CacheFile && fs.existsSync(md5CacheFile)) {
    md5Cache = JSON.parse(fs.readFileSync(md5CacheFile).toString() || '{}')
}

function calcFileMD5Change(filePath) {
    if (!md5CacheFile) {
        return true
    }

    let fileContent
    let stat = fs.statSync(filePath)
    // 大文件读取较慢, 使用mtimeMs和size来判断是否修改
    if (stat.size > 50 * 1024 * 1024) {
        fileContent = `${stat.mtimeMs};${stat.ctimeMs};${stat.size}`
    } else {
        fileContent = fs.readFileSync(filePath)
    }
    const md5Hash = crypto.createHash('md5').update(fileContent).digest('hex')

    if (md5Cache[filePath] === md5Hash) {
        return false
    }

    md5Cache[filePath] = md5Hash;
    return true
}

function saveFileMD5Change() {
    if (!md5CacheFile) {
        return
    }
    fs.writeFileSync(md5CacheFile, JSON.stringify(md5Cache, null, 2))
    console.log('已更新' + md5CacheFile + '文件')
}

module.exports = {
    calcFileMD5Change,
    saveFileMD5Change,
}
