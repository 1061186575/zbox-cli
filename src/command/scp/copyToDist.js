const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { prompt } = require('./utils')

let workdir = process.cwd()
let targetDir = ""
let config = {}
let md5Cache = {}

// 需要复制和忽略的文件路径
let includesPath = []
let excludesPath = []
let excludesAnyPath = []

// 统计信息
let excludeFiles = [];
let uploadFiles = [];

function startCopyFile(dir, configParam) {
    targetDir = dir;
    config = configParam;
    includesPath = config.includes || []
    excludesPath = config.excludes || []
    excludesAnyPath = config.excludesAnyPath || []

    // init md5Cache
    if (config.md5CacheFile) {
        const md5CacheFilePath = path.join(workdir, config.md5CacheFile)
        if (fs.existsSync(md5CacheFilePath)) {
            md5Cache = JSON.parse(fs.readFileSync(md5CacheFilePath).toString() || '{}')
        }
    }

    return new Promise(resolve => {
        if (fs.existsSync(targetDir)) {
            prompt(`${targetDir}目录已存在, 是否删除该目录? (y/n)\n`).then(res => {
                if (res === 'y') {
                    clearDist()
                    startCopy()
                    resolve(!!uploadFiles.length)
                } else if (res === 'n') {
                    console.log('取消删除')
                    resolve(false)
                } else {
                    console.log('无效输入')
                    resolve(false)
                }
            })
        } else {
            startCopy()
            resolve(!!uploadFiles.length)
        }
    })
}


function clearDist(dir) {
    let absoluteDir = dir || targetDir;
    if (deleteAllFile(absoluteDir)) {
        console.log(`删除成功: ${absoluteDir}\n`)
    }
}

function startCopy() {
    for (let i = 0; i < includesPath.length; i++) {
        console.log('\n复制', includesPath[i])
        let sourcePath = path.join(workdir, includesPath[i])
        let targetPath = path.join(targetDir, includesPath[i])
        copyAllFile(sourcePath, targetPath)
    }
    console.log('所有跳过的文件:', excludeFiles)
    console.log('所有复制的文件:', uploadFiles)
    console.log("复制文件总数: ", uploadFiles.length)
}

function copyAllFile(sourcePath, targetPath) {
    if (skipFile(sourcePath)) {
        excludeFiles.push(sourcePath)
        console.log('跳过文件(夹): ', sourcePath)
        return
    }

    if (fs.statSync(sourcePath).isFile()) {
        copyFile(sourcePath, targetPath)
        return
    }

    const files = fs.readdirSync(sourcePath);

    files.forEach(file => {
        const sourceFilePath = path.join(sourcePath, file);
        const targetFilePath = path.join(targetPath, file);

        const stats = fs.statSync(sourceFilePath);

        if (stats.isFile()) {
            copyFile(sourceFilePath, targetFilePath);
        } else if (stats.isDirectory()) {
            copyAllFile(sourceFilePath, targetFilePath);
        }
    });
}

function skipFile(readPath) {
    return !!(excludesPath.find(d => readPath.startsWith(path.join(workdir, d))) || excludesAnyPath.find(d => readPath.includes(d)));
}

function copyFile(readPath, writePath) {
    if (skipFile(readPath)) {
        excludeFiles.push(readPath)
        console.log('跳过文件: ', readPath)
        return
    }
    if (!calcFileMD5Change(readPath)) {
        console.log('未改动: ', readPath)
        return;
    }
    let dir = path.parse(writePath).dir
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    console.log(readPath, '\t--->\t', writePath);
    let read = fs.createReadStream(readPath)
    let write = fs.createWriteStream(writePath)
    read.pipe(write)
    uploadFiles.push(readPath)
}


// 删除文件或目录
function deleteAllFile(filePath) {
    let files = fs.readdirSync(filePath);
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let curPath = path.join(filePath, "/", file);
        if (fs.statSync(curPath).isDirectory()) {
            deleteAllFile(curPath); // 递归删除目录
        } else {
            fs.unlinkSync(curPath); // 删除文件
        }
    }
    if (fs.readdirSync(filePath).length === 0) {
        fs.rmdirSync(filePath);
        return true;
    }
    return false;
}


function calcFileMD5Change(filePath) {
    if (!config.md5CacheFile) {
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
    if (!config.md5CacheFile) {
        return
    }
    const md5CacheFilePath = path.join(workdir, config.md5CacheFile)
    fs.writeFileSync(md5CacheFilePath, JSON.stringify(md5Cache, null, 2))
    console.log('已更新' + md5CacheFilePath + '文件')
}

module.exports = {
    startCopyFile,
    clearDist,
    saveFileMD5Change,
}
