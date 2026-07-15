const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Transform } = require('stream')
const { pipeline } = require('stream/promises')
const { question } = require("../utils");

async function main(actionPath, action, recordFileName = '.__RECORDFILENAME', base64 = false, ext = false) {

    if (!actionPath) {
        actionPath = await question('请输入文件夹路径: ')
    }
    const directoryPath = path.resolve(actionPath)
    console.log(`directoryPath`, directoryPath);

    if (!action) {
        action = await question('请输入操作(1: rename, 2: restore): ')
    }

    if (action === '1') {
        await randomRename(directoryPath, recordFileName, base64, ext)
    } else if (action === '2') {
        await restore(directoryPath, recordFileName, base64)
    } else {
        console.log('无效输入')
    }

}


// 将文件重命名并保存原文件名和新文件名到 recordFileName
async function randomRename(directoryPath, recordFileName, base64, ext) {

    if (!fs.existsSync(directoryPath)) {
        console.log('文件夹不存在')
        return
    }

    const nameFilePath = path.join(directoryPath, recordFileName)

    if (fs.existsSync(nameFilePath)) {
        console.log('需要先还原才能继续重命名')
        console.log(`${nameFilePath} exists!`);
        return;
    }

    try {
        const filePaths = getAllFilePaths(directoryPath).filter((filePath) => {
            return !isRecordFilePath(directoryPath, filePath, recordFileName)
        })
        const nameMap = createNameMap(directoryPath, filePaths, recordFileName, base64, ext)

        // 先写完整记录，再开始移动/编码文件，避免中途中断后无法恢复文件名。
        writeRecordFile(nameFilePath, nameMap)
        console.log(`writeFileSync: ${nameFilePath}`)

        for (const filePath of filePaths) {
            const fileName = filePath.replace(directoryPath, '')
            const randomName = nameMap[fileName]
            const renamedFilePath = path.join(directoryPath, randomName)

            // 链接文件只移动链接本身，避免 base64 模式读取并改写链接目标。
            if (base64 && !isSymbolicLink(filePath)) {
                await encodeFileToBase64(filePath, renamedFilePath)
                // console.log(`已对文件进行 base64 编码: ${fileName} -> ${randomName}`)
            } else {
                fs.renameSync(filePath, renamedFilePath)
            }
        }
    } catch (e) {
        console.log('e', e)
        return
    }

    deleteEmptyFolder(directoryPath)
    console.log('Files renamed successfully.')
}


// 根据 recordFileName 还原文件名
async function restore(directoryPath, recordFileName, base64) {
    const nameFilePath = path.join(directoryPath, recordFileName)

    if (!fs.existsSync(nameFilePath)) {
        console.log('需要先重命名才能继续还原')
        console.log(`${nameFilePath} file does not exist.`);
        return;
    }

    const nameFileContent = numToStr(fs.readFileSync(nameFilePath, 'utf8'))
    const nameMap = JSON.parse(nameFileContent)

    // 获取是否使用了 base64 编码
    let isUseBase64 = nameMap.__isUseBase64 || false
    delete nameMap.__isUseBase64  // 删除标记字段，避免当作文件名处理

    // 如果文件里面没有 base64 标记, 但是参数传了 base64 标记, 二次确认
    if (!isUseBase64 && base64) {
        const confirm = await question('文件里面没有 base64 标记, 确定要 base64 解码? (y/n): ')
        if (confirm === 'y') {
            isUseBase64 = true;
        }
    }

    const errList = [];
    const warnList = [];
    for (const [originalName, renamedName] of Object.entries(nameMap)) {
        const renamedFilePath = path.join(directoryPath, renamedName)
        const restoredFilePath = path.join(directoryPath, originalName)

        if (!pathExists(renamedFilePath)) {
            if (pathExists(restoredFilePath)) {
                continue
            }
            errList.push(`原文件不存在, 无法重命名 ❌ : ${renamedName} -> ${originalName}`)
            continue
        }

        fs.mkdirSync(path.parse(restoredFilePath).dir, { recursive: true });

        try {
            // 链接文件只移动链接本身，避免 base64 模式读取并改写链接目标。
            if (isUseBase64 && !isSymbolicLink(renamedFilePath)) {
                // 读取文件部分内容，判断是否是 base64 格式, 避免误解码
                const firstChars = safeReadFirstChars(renamedFilePath);
                const base64Regexp = /^[A-Za-z0-9+/]*={0,2}$/;
                if (base64Regexp.test(firstChars)) {
                    await decodeFileFromBase64(renamedFilePath, restoredFilePath)
                    // console.log(`已对文件进行 base64 解码并还原: ${renamedName} -> ${originalName}`)
                } else {
                    warnList.push(`文件内容不是base64格式, 仅重命名, 不能解码: ${renamedName} -> ${originalName}`)
                    fs.renameSync(renamedFilePath, restoredFilePath)
                }
            } else {
                fs.renameSync(renamedFilePath, restoredFilePath)
            }
        } catch (e) {
            errList.push(`还原失败 ❌ : ${renamedName} -> ${originalName}, ${e.message}`)
        }
    }

    if (errList.length) {
        console.log(`errList`, errList);
        if (warnList.length) {
            console.log(`warnList`, warnList);
        }
        console.log(`保留记录文件，修复问题后可再次执行还原: ${nameFilePath}`)
        return
    }

    if (warnList.length) {
        console.log(`warnList`, warnList);
    } else {
        console.log('Files restored successfully.')
    }
    fs.unlinkSync(nameFilePath)
    console.log(`delete ${nameFilePath}`)
}


function deleteEmptyFolder(folderPath) {
    if (!pathExists(folderPath)) {
        console.log(`deleteEmptyFolder: 文件夹 ${folderPath} 不存在`);
        return;
    }

    fs.readdirSync(folderPath).forEach((file) => {
        const filePath = path.join(folderPath, file);
        if (pathExists(filePath)) {
            const stats = fs.lstatSync(filePath);

            if (stats.isDirectory()) {
                deleteEmptyFolder(filePath);
            }
        }
    });

    try {
        fs.rmdirSync(folderPath);
    } catch (e) {
        // 不是空文件夹
    }
}

function generateRandomName() {
    const randomBytes = crypto.randomBytes(16)
    return `${randomBytes.toString('hex')}_${Date.now()}`
}

function createNameMap(directoryPath, filePaths, recordFileName, base64, ext) {
    const nameMap = {
        __isUseBase64: base64,
    }
    const usedNames = new Set([recordFileName])

    filePaths.forEach((filePath) => {
        usedNames.add(path.basename(filePath))
    })

    filePaths.forEach((filePath) => {
        const fileName = filePath.replace(directoryPath, '')
        let extname = ''
        if (ext) {
            extname = path.extname(fileName)
        }

        let randomName = generateRandomName() + extname
        while (usedNames.has(randomName) || pathExists(path.join(directoryPath, randomName))) {
            randomName = generateRandomName() + extname
        }

        usedNames.add(randomName)
        nameMap[fileName] = randomName
    })

    return nameMap
}

function writeRecordFile(nameFilePath, nameMap) {
    const nameFileContent = JSON.stringify(nameMap, null, 2)
    const tempPath = `${nameFilePath}.tmp-${process.pid}-${Date.now()}`

    try {
        fs.writeFileSync(tempPath, strToNum(nameFileContent), { flag: 'wx' })
        fs.renameSync(tempPath, nameFilePath)
    } catch (e) {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath)
        }
        throw e
    }
}

function isRecordFilePath(directoryPath, filePath, recordFileName) {
    const relativePath = path.relative(directoryPath, filePath)

    return relativePath === recordFileName || relativePath.startsWith(`${recordFileName}.tmp-`)
}

function getAllFilePaths(dirPath) {
    let filePaths = []

    const files = fs.readdirSync(dirPath)

    files.forEach((file) => {
        const filePath = path.join(dirPath, file)
        const stat = fs.lstatSync(filePath)

        if (stat.isSymbolicLink()) {
            filePaths.push(filePath)
        } else if (stat.isDirectory()) {
            const nestedFilePaths = getAllFilePaths(filePath)
            filePaths = filePaths.concat(nestedFilePaths)
        } else {
            filePaths.push(filePath)
        }
    })

    return filePaths
}

function strToNum(str) {
    return Buffer.from(str, 'utf8').map(d => d).join(',')
}

function numToStr(num) {
    return Buffer.from(num.split(','), 'utf8').toString()
}

// 使用流的方式对文件进行 base64 编码，避免大文件占用大量内存
async function encodeFileToBase64(inputPath, outputPath) {
    const tempPath = createTempFilePath(outputPath)

    try {
        await pipeline(
            fs.createReadStream(inputPath),
            createBase64EncodeStream(),
            fs.createWriteStream(tempPath, { flags: 'wx' }),
        )
        fs.renameSync(tempPath, outputPath)
        fs.unlinkSync(inputPath)
    } catch (e) {
        cleanupTempFile(tempPath)
        throw e
    }
}

// 使用流的方式对文件进行 base64 解码
async function decodeFileFromBase64(inputPath, outputPath) {
    const tempPath = createTempFilePath(outputPath)

    try {
        await pipeline(
            fs.createReadStream(inputPath),
            createBase64DecodeStream(),
            fs.createWriteStream(tempPath, { flags: 'wx' }),
        )
        fs.renameSync(tempPath, outputPath)
        fs.unlinkSync(inputPath)
    } catch (e) {
        cleanupTempFile(tempPath)
        throw e
    }
}

function createBase64EncodeStream() {
    let buffer = Buffer.alloc(0)

    return new Transform({
        transform(chunk, encoding, callback) {
            buffer = Buffer.concat([buffer, chunk])

            // 每次处理 3 的倍数，确保 base64 编码的正确性
            const processLength = Math.floor(buffer.length / 3) * 3
            if (processLength > 0) {
                const processBuffer = buffer.slice(0, processLength)
                this.push(processBuffer.toString('base64'))
                buffer = buffer.slice(processLength)
            }
            callback()
        },
        flush(callback) {
            if (buffer.length > 0) {
                this.push(buffer.toString('base64'))
            }
            callback()
        },
    })
}

function createBase64DecodeStream() {
    let buffer = ''

    return new Transform({
        transform(chunk, encoding, callback) {
            buffer += chunk.toString('utf8')

            // 每次处理 4 的倍数，确保 base64 解码的正确性
            const processLength = Math.floor(buffer.length / 4) * 4
            if (processLength > 0) {
                const processString = buffer.slice(0, processLength)
                this.push(Buffer.from(processString, 'base64'))
                buffer = buffer.slice(processLength)
            }
            callback()
        },
        flush(callback) {
            if (buffer.length > 0) {
                this.push(Buffer.from(buffer, 'base64'))
            }
            callback()
        },
    })
}

function createTempFilePath(filePath) {
    return `${filePath}.tmp-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
}

function cleanupTempFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }
}

function pathExists(filePath) {
    try {
        fs.lstatSync(filePath)
        return true
    } catch (e) {
        if (e.code === 'ENOENT') {
            return false
        }
        throw e
    }
}

function isSymbolicLink(filePath) {
    try {
        return fs.lstatSync(filePath).isSymbolicLink()
    } catch (e) {
        if (e.code === 'ENOENT') {
            return false
        }
        throw e
    }
}

function safeReadFirstChars(filePath, charLength = 10000) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const fileSize = fs.fstatSync(fd).size;
        const bytesToRead = Math.min(charLength, fileSize);
        const buffer = Buffer.alloc(bytesToRead);

        fs.readSync(fd, buffer, 0, bytesToRead, 0);
        fs.closeSync(fd);

        return buffer.toString();
    } catch (err) {
        console.error('读取文件错误:', err);
        return '';
    }
}

module.exports = main
