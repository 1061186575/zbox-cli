const path = require('path');
const { ExifTool, ExifDateTime } = require('exiftool-vendored');
const { TaskController } = require('../utils/taskController');
const { formatDateTime, getAllFilePaths } = require('../utils');

const mediaExtensions = new Set([
    '.3gp', '.arw', '.avi', '.avif', '.bmp', '.cr2', '.cr3', '.dng', '.gif',
    '.heic', '.heif', '.jpeg', '.jpg', '.m2ts', '.m4v', '.mkv', '.mov', '.mp4',
    '.mpeg', '.mpg', '.mts', '.nef', '.orf', '.png', '.raf', '.raw', '.rw2',
    '.tif', '.tiff', '.ts', '.webm', '.webp'
]);

const captureTimeTagNames = [
    'SubSecDateTimeOriginal',
    'DateTimeOriginal',
    'SubSecCreateDate',
    'CreateDate',
    'MediaCreateDate',
    'TrackCreateDate',
    'CreationDate',
    'ContentCreateDate',
    'DateCreated'
];

function isMediaFile(filePath) {
    return mediaExtensions.has(path.extname(filePath).toLowerCase());
}

function normalizeCaptureTime(value) {
    if (!value) {
        return null;
    }

    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? null : { date, writeValue: value };
    }

    if (typeof value === 'string') {
        const exifDateTime = ExifDateTime.from(value);
        if (exifDateTime) {
            return { date: exifDateTime.toDate(), writeValue: exifDateTime };
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : { date, writeValue: date.toISOString() };
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return { date: value, writeValue: value.toISOString() };
    }

    return null;
}

function getCaptureTime(tags) {
    for (const tagName of captureTimeTagNames) {
        const captureTime = normalizeCaptureTime(tags[tagName]);
        if (captureTime) {
            return { ...captureTime, tagName };
        }
    }

    return null;
}

async function repairMediaFileTime(exiftool, filePath) {
    try {
        const tags = await exiftool.read(filePath);
        const captureTime = getCaptureTime(tags);

        if (!captureTime) {
            return {
                filePath,
                status: 'skipped',
                message: '未找到可用的拍摄时间'
            };
        }

        await exiftool.write(filePath, {
            FileCreateDate: captureTime.writeValue,
            FileModifyDate: captureTime.writeValue
        }, {
            writeArgs: ['-overwrite_original']
        });

        return {
            filePath,
            status: 'success',
            captureTime: captureTime.date,
            tagName: captureTime.tagName
        };
    } catch (error) {
        return {
            filePath,
            status: 'failed',
            message: error.message
        };
    }
}

function parseConcurrency(value) {
    const concurrency = Number(value);
    return Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 0;
}

async function main(input, options = {}) {
    const inputPath = path.resolve(input);
    const recursive = options.recursive !== false;
    const concurrency = parseConcurrency(options.concurrency ?? 10);

    if (!concurrency) {
        console.error('并发个数必须是大于 0 的整数');
        return;
    }

    let filePaths;
    try {
        filePaths = (await getAllFilePaths(inputPath, recursive)).filter(isMediaFile);
    } catch (error) {
        console.error(`读取路径失败: ${error.message}`);
        return;
    }

    console.log('处理路径:', inputPath);
    console.log('递归处理子目录:', recursive);
    console.log('最大并发个数:', concurrency);
    console.log(`找到 ${filePaths.length} 个图片或视频文件`);

    if (!filePaths.length) {
        return {
            total: 0,
            success: 0,
            skipped: 0,
            failed: 0,
            results: []
        };
    }

    const exiftool = new ExifTool({ maxProcs: concurrency });
    const controller = new TaskController(concurrency);

    try {
        const results = await Promise.all(filePaths.map(filePath => controller.addTask(
            () => repairMediaFileTime(exiftool, filePath)
        )));

        for (const result of results) {
            if (result.status === 'success') {
                console.log(`✅ ${result.filePath} <- ${result.tagName}: ${formatDateTime(result.captureTime)}`);
            } else if (result.status === 'skipped') {
                console.log(`⚠️ ${result.filePath}: ${result.message}`);
            } else {
                console.error(`❌ ${result.filePath}: ${result.message}`);
            }
        }

        const summary = results.reduce((result, item) => {
            result[item.status]++;
            return result;
        }, {
            total: results.length,
            success: 0,
            skipped: 0,
            failed: 0,
            results
        });

        console.log(`处理完成：成功 ${summary.success}，跳过 ${summary.skipped}，失败 ${summary.failed}`);
        return summary;
    } finally {
        await exiftool.end();
    }
}

module.exports = main;
module.exports.getCaptureTime = getCaptureTime;
module.exports.isMediaFile = isMediaFile;
module.exports.parseConcurrency = parseConcurrency;
module.exports.repairMediaFileTime = repairMediaFileTime;
