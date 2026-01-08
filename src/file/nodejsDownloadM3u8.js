const axios = require('axios');
const m3u8Parser = require('m3u8-parser');
const fs = require('fs');
const path = require('path');

/**
 * 用 nodejs下载文件, 不使用 ffmpeg, 下载之前需要检查下载的单个ts文件是否可以播放, 可以播放再使用本文件下载
 * 下载中途可以中断, 不会重复下载
 * 如果要下载多个, 修改 url 和 filename, 打开新终端运行
 */

const m3u8Url = 'https://xxx.com/xxx/index.m3u8';
const m3u8FileName = 'xxx.mp4'
const saveDir = 'C:\\M3U8Download'
const segmentsHasBaseUrl = true


const outputFilePath = path.join(saveDir, m3u8FileName);
const m3u8UrlPath = path.join(saveDir, m3u8Url.replace(/[:\/]/g, '_'))
const m3u8TsDir = m3u8UrlPath + '.ts'
const downloadFailList = []
console.log('m3u8UrlPath', m3u8UrlPath)
console.log('m3u8TsDir', m3u8TsDir)

if (!fs.existsSync(m3u8TsDir)) {
    fs.mkdirSync(m3u8TsDir)
}
if (fs.existsSync(outputFilePath)) {
    console.log('目标文件已存在', outputFilePath)
    throw '目标文件已存在'
}

async function start() {
    const m3u8Content = await getM3u8Content(m3u8Url)
    const segments = getSegments(m3u8Content)
    download(segments)
}

start()


async function getM3u8Content(m3u8Url) {
    if (fs.existsSync(m3u8UrlPath)) {
        return fs.readFileSync(m3u8UrlPath, 'utf8')
    }
    return axios.get(m3u8Url)
        .then(response => {
            const m3u8Content = response.data;
            fs.writeFileSync(m3u8UrlPath, m3u8Content)
            return m3u8Content
        })
        .catch(error => {
            console.error('下载失败：', error.message);
        });
}

function getSegments(m3u8Content) {
    const parser = new m3u8Parser.Parser();
    parser.push(m3u8Content);
    parser.end();
    return parser.manifest.segments
}

function download(segments) {
    const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/'));
    console.log('baseUrl', baseUrl)

    // 逐个下载视频片段并写入文件
    function downloadSegment(index) {

        console.log(`下载第${index}个, 还剩${segments.length - index}个, 进度${((index / segments.length) * 100).toFixed(2)}%`)

        if (index >= segments.length) {
            console.log('M3U8视频下载完成！');
            if (downloadFailList.length) {
                console.log('下载失败 ', downloadFailList.length, ' 个', downloadFailList)
            } else {
                console.log('全部下载成功!')
            }
            mergeFiles(segments)
            return;
        }

        const segmentUrl = segmentsHasBaseUrl ? segments[index].uri : `${baseUrl}/${segments[index].uri}`;
        console.log('segmentUrl', segmentUrl)

        const tsFilePath = path.join(m3u8TsDir, path.parse(segmentUrl).base)

        // 不重复下载
        if (fs.existsSync(tsFilePath)) {
            downloadSegment(index + 1);
            return;
        }

        axios.get(segmentUrl, {
            timeout: 20 * 1000,
            responseType: 'stream'
        })
            .then(response => {
                const outputStream = fs.createWriteStream(tsFilePath);
                response.data.pipe(outputStream);
                downloadSegment(index + 1);
            })
            .catch(error => {
                console.error('下载失败：', error.message);
                downloadFailList.push({
                    segmentUrl,
                    tsFilePath,
                    msg: error.message,
                })
                downloadSegment(index + 1);
            });
    }

    // 开始下载第一个视频片段
    downloadSegment(0);
}


function mergeFiles(segments) {
    console.log('开始合并');

    const outputStream = fs.createWriteStream(outputFilePath);

    function writeNextStream(index) {
        if (index >= segments.length) {
            outputStream.end();
            console.log('合并完成！', outputFilePath);
            return;
        }

        const segmentUrl = segments[index].uri;
        const tsFilePath = path.join(m3u8TsDir, path.parse(segmentUrl).base);
        if (!fs.existsSync(tsFilePath)) {
            console.log(tsFilePath, '文件不存在, 提前结束')
            return;
        }
        const readStream = fs.createReadStream(tsFilePath);
        readStream.pipe(outputStream, { end: false });
        readStream.on('end', () => {
            writeNextStream(index + 1);
        });
    }

    // 从第一个片段开始递归写入
    writeNextStream(0);
}
