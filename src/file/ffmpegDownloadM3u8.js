const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')
const readline = require('readline')
const { TaskController } = require("../utils/TaskController");


let ffmpegFile = 'ffmpeg'
let maxConcurrentTasks = 3
let saveDir = path.resolve('output')
let inputFile = undefined
// let inputFile = path.resolve('m3u8List.txt')

async function main(options) {
    if (options.printInputFileTemplate) {
        printInputFileTemplate();
        return
    }

    console.log(`options`, options);

    if (options.saveDir) {
        saveDir = path.resolve(options.saveDir)
    }
    if (options.inputFile) {
        inputFile = path.resolve(options.inputFile)
    }
    if (options.ffmpegFile) {
        ffmpegFile = path.resolve(options.ffmpegFile)
    }
    if (options.maxConcurrentTasks) {
        maxConcurrentTasks = Number(options.maxConcurrentTasks)
    }


    let urls = []
    let urlsName = []

    if (options.url) {
        urls.push(options.url)
    } else {
        urls.push(await prompt('请输入m3u8文件url:\n'))
    }
    if (options.saveFilename) {
        urlsName.push(options.saveFilename)
    } else {
        urlsName.push(await prompt('请输入文件名称(可不填直接按回车):\n'))
    }

    if (inputFile) {
        let str = fs.readFileSync(inputFile).toString()
        setUrls(str, urls, urlsName)
    }

    console.log('saveDir', saveDir)
    console.log('urls', urls)
    console.log('urlsName', urlsName)
    console.log('总下载文件数', urls.length)

    if (urls.length !== urlsName.length) {
        console.log('urls和urlsName长度不一致, 输入信息有误')
        return
    }

    if (await prompt('确认下载? (y/n)\n') !== 'y') {
        return
    }

    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir)
    }

    ffDownload(urls, urlsName)
}

async function ffDownload(urls, urlsName = []) {
    const controller = new TaskController(maxConcurrentTasks);

    for (let i = 0; i < urls.length; i++) {
        controller.addTask(async () => {
            let url = urls[i].trim()
            let cur = i + 1
            console.log('\n')
            console.log(`当前下载第${cur}个`, url)
            let filename = urlsName[i]
            if (!filename) {
                let arr = url.split('/')
                filename = arr.at(-2) + '-' + arr.at(-1)
            }
            let filePath = path.join(saveDir, filename + '.mp4')
            if (fs.existsSync(filePath)) {
                console.log(`第${cur}个文件已存在:`, filePath);
            } else {
                // hwaccel => hardware acceleration
                let args = ['-hwaccel', 'auto', '-i', url, filePath];
                // let args = ['-hwaccel', 'auto', '-i', url, '-threads', '4', filePath];
                console.log('args', args)
                await spawnSync(ffmpegFile, args, {
                    stdio: 'inherit'
                })
                console.log(`第${cur}个下载完成: `, filePath)

                await delay(2000)
            }
        });
    }
}


function setUrls(str, urls, urlsName) {
    str.split(/\n|\r\n/).filter(d => {
        d = d.trim()
        if (!d) return false
        if (d.startsWith('saveDir:')) {
            saveDir = d.split('saveDir:')[1].trim()
            saveDir = path.resolve(saveDir)
            return false
        }
        let index = d.indexOf('.m3u8')
        if (index === -1 || !d.startsWith('http')) {
            console.log('已过滤:', d)
            return false
        }
        return true
    }).forEach((d, i) => {
        d = d.trim()
        const arr = d.split(/\s+/)
        urls.push(arr[0])
        urlsName.push(arr.slice(1).join('_').replaceAll('/', '_'))
    })
}


function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}


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

function printInputFileTemplate() {
    console.log(`
saveDir: output/video

https://www.demo.com/video/a.m3u8    a.pm4
https://www.demo.com/video/b.m3u8    b.mp4
// https://www.demo.com/video/c.m3u8    c.mp4 这个注释掉就不会下载

`);
}

module.exports = main
