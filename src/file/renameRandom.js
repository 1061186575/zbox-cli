const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { question } = require("../utils");

async function main(actionPath, action, recordFileName = '.__RECORDFILENAME') {

    if (!actionPath) {
        actionPath = await question('请输入文件夹路径:')
    }
    const directoryPath = path.resolve(actionPath)

    if (!action) {
        action = await question('请输入操作(1: rename, 2: restore):')
    }

    if (action === '1') {
        renameRandom(directoryPath, recordFileName)
    } else if (action === '2') {
        restore(directoryPath, recordFileName)
    } else {
        console.log('输入错误')
    }

}


// 将文件重命名并保存原文件名和新文件名到 recordFileName
function renameRandom(directoryPath, recordFileName) {

    if (!fs.existsSync(directoryPath)) {
        console.log('文件夹不存在')
        return
    }

    const nameFilePath = path.join(directoryPath, recordFileName)

    if (fs.existsSync(nameFilePath)) {
        console.log('需要先还原才能继续重命名')
        throw `${nameFilePath} exists!`
    }

    const nameMap = {}

    try {
        const filePaths = getAllFilePaths(directoryPath)

        filePaths.forEach((filePath) => {
            const fileName = filePath.replace(directoryPath, '')
            const randomName = generateRandomName()
            const renamedFilePath = path.join(directoryPath, randomName)
            fs.renameSync(filePath, renamedFilePath)
            nameMap[fileName] = randomName
        })
    } catch (e) {
        console.log('e', e)
        return
    } finally {
        console.log('nameMap', nameMap)
    }
    console.log('Files renamed successfully.')

    const nameFileContent = JSON.stringify(nameMap, null, 2)
    fs.writeFileSync(nameFilePath, strToNum(nameFileContent))
    console.log(`writeFileSync: ${nameFilePath}`)

    deleteEmptyFolder(directoryPath)
}


// 根据 recordFileName 还原文件名
function restore(directoryPath, recordFileName) {
    const nameFilePath = path.join(directoryPath, recordFileName)

    if (!fs.existsSync(nameFilePath)) {
        console.log('需要先重命名才能继续还原')
        throw `${nameFilePath} file does not exist.`
    }

    const nameFileContent = numToStr(fs.readFileSync(nameFilePath, 'utf8'))
    const nameMap = JSON.parse(nameFileContent)

    Object.entries(nameMap).forEach(([originalName, renamedName]) => {
        const originalFilePath = path.join(directoryPath, renamedName)
        const restoredFilePath = path.join(directoryPath, originalName)

        fs.mkdirSync(path.parse(restoredFilePath).dir, { recursive: true });
        fs.renameSync(originalFilePath, restoredFilePath)
    })
    console.log('Files restored successfully.')

    fs.rmSync(nameFilePath)
    console.log(`delete ${nameFilePath}`)
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

module.exports = main
