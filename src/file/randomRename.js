const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
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
        randomRename(directoryPath, recordFileName, base64, ext)
    } else if (action === '2') {
        restore(directoryPath, recordFileName, base64)
    } else {
        console.log('无效输入')
    }

}


// 将文件重命名并保存原文件名和新文件名到 recordFileName
function randomRename(directoryPath, recordFileName, base64, ext) {

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

    const nameMap = {
        __isUseBase64: base64,
    }

    try {
        const filePaths = getAllFilePaths(directoryPath)

        filePaths.forEach((filePath) => {
            const fileName = filePath.replace(directoryPath, '')
            let extname = ''
            if (ext) {
                extname = path.extname(fileName)
            }
            const randomName = generateRandomName() + extname
            const renamedFilePath = path.join(directoryPath, randomName)

            // 如果启用 base64，对文件内容进行编码
            if (base64) {
                encodeFileToBase64(filePath, renamedFilePath)
                console.log(`已对文件进行 base64 编码: ${fileName} -> ${randomName}`)
            } else {
                fs.renameSync(filePath, renamedFilePath)
            }

            nameMap[fileName] = randomName
        })
    } catch (e) {
        console.log('e', e)
        return
    }
    console.log('Files renamed successfully.')

    const nameFileContent = JSON.stringify(nameMap, null, 2)
    fs.writeFileSync(nameFilePath, strToNum(nameFileContent))
    console.log(`writeFileSync: ${nameFilePath}`)

    deleteEmptyFolder(directoryPath)
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
    Object.entries(nameMap).forEach(([originalName, renamedName]) => {
        const originalFilePath = path.join(directoryPath, renamedName)
        const restoredFilePath = path.join(directoryPath, originalName)

        fs.mkdirSync(path.parse(restoredFilePath).dir, { recursive: true });

        // 如果使用了 base64 编码，需要先解码再还原文件名
        if (isUseBase64) {
            // 读取文件部分内容，判断是否是 base64 格式, 避免误解码
            const firstChars = safeReadFirstChars(originalFilePath);
            const base64Regexp = /^[A-Za-z0-9+/]*={0,2}$/;
            if (base64Regexp.test(firstChars)) {
                decodeFileFromBase64(originalFilePath, restoredFilePath)
                // console.log(`已对文件进行 base64 解码并还原: ${renamedName} -> ${originalName}`)
            } else {
                errList.push(`文件内容不是base64格式, 仅重命名, 不能解码: ${originalFilePath}`)
                fs.renameSync(originalFilePath, restoredFilePath)
            }
        } else {
            fs.renameSync(originalFilePath, restoredFilePath)
        }
    })

    if (errList.length) {
        console.log(`errList`, errList);
    } else {
        console.log('Files restored successfully.')
        fs.rmSync(nameFilePath)
        console.log(`delete ${nameFilePath}`)
    }
}


function deleteEmptyFolder(folderPath) {
    if (!fs.existsSync(folderPath)) {
        console.log(`deleteEmptyFolder: 文件夹 ${folderPath} 不存在`);
        return;
    }

    fs.readdirSync(folderPath).forEach((file) => {
        const filePath = path.join(folderPath, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);

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

function getAllFilePaths(dirPath) {
    let filePaths = []

    const files = fs.readdirSync(dirPath)

    files.forEach((file) => {
        const filePath = path.join(dirPath, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
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
function encodeFileToBase64(inputPath, outputPath) {
    const readStream = fs.createReadStream(inputPath)
    const writeStream = fs.createWriteStream(outputPath)

    let buffer = Buffer.alloc(0)

    readStream.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk])

        // 每次处理 3KB 的倍数，确保 base64 编码的正确性
        const processLength = Math.floor(buffer.length / 3) * 3
        if (processLength > 0) {
            const processBuffer = buffer.slice(0, processLength)
            const base64Chunk = processBuffer.toString('base64')
            writeStream.write(base64Chunk)
            buffer = buffer.slice(processLength)
        }
    })

    readStream.on('end', () => {
        // 处理剩余的数据
        if (buffer.length > 0) {
            const base64Chunk = buffer.toString('base64')
            writeStream.write(base64Chunk)
        }
        writeStream.end()

        // 删除原文件
        fs.unlinkSync(inputPath)
    })

    readStream.on('error', (err) => {
        console.error('读取文件时出错:', err)
        writeStream.destroy()
    })

    writeStream.on('error', (err) => {
        console.error('写入文件时出错:', err)
        readStream.destroy()
    })
}

// 使用流的方式对文件进行 base64 解码
function decodeFileFromBase64(inputPath, outputPath) {
    const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' })
    const writeStream = fs.createWriteStream(outputPath)

    let buffer = ''

    readStream.on('data', (chunk) => {
        buffer += chunk

        // 每次处理 4KB 的倍数，确保 base64 解码的正确性
        const processLength = Math.floor(buffer.length / 4) * 4
        if (processLength > 0) {
            const processString = buffer.slice(0, processLength)
            const decodedBuffer = Buffer.from(processString, 'base64')
            writeStream.write(decodedBuffer)
            buffer = buffer.slice(processLength)
        }
    })

    readStream.on('end', () => {
        // 处理剩余的数据
        if (buffer.length > 0) {
            const decodedBuffer = Buffer.from(buffer, 'base64')
            writeStream.write(decodedBuffer)
        }
        writeStream.end()

        // 删除编码后的文件
        fs.unlinkSync(inputPath)
    })

    readStream.on('error', (err) => {
        console.error('读取文件时出错:', err)
        writeStream.destroy()
    })

    writeStream.on('error', (err) => {
        console.error('写入文件时出错:', err)
        readStream.destroy()
    })
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
