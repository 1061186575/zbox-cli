const fs = require('fs').promises;
const path = require('path');
const { ExifTool } = require('exiftool-vendored');

// 定义需要处理的图片/视频扩展名
const MEDIA_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.heic', '.heif', '.gif', '.webp', // 图片
    '.mp4', '.mov', '.avi', '.mkv', '.webm'                     // 视频
]);

/**
 * 递归/非递归获取目录下的所有媒体文件
 * @param {string} dir - 目录路径
 * @param {boolean} recursive - 是否递归
 * @returns {Promise<string[]>} 文件绝对路径数组
 */
async function getMediaFiles(dir, recursive) {
    let results = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (recursive) {
                const subFiles = await getMediaFiles(fullPath, recursive);
                results = results.concat(subFiles);
            }
        } else {
            const ext = path.extname(fullPath).toLowerCase();
            if (MEDIA_EXTENSIONS.has(ext)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

/**
 * 获取指定目录下所有图片/视频，并按拍摄时间从小到大排序
 * @param {string} dirPath - 目录路径
 * @param {boolean} recursive - 是否递归读取子目录
 * @returns {Promise<string[]>} 排序后的文件路径数组
 */
async function getSortedMediaFiles(dirPath, recursive = false) {
    // 实例化 ExifTool
    const exiftool = new ExifTool();

    try {
        // 1. 获取所有媒体文件路径
        const files = await getMediaFiles(dirPath, recursive);

        const fileInfos = [];

        // 2. 遍历读取每个文件的拍摄时间
        // 这里如果文件极多，可以使用 Promise.all 并发读取，但为了避免占用过多内存，当前使用 for...of 串行读取
        for (const file of files) {
            let shootingTimeMs = 0;

            try {
                const tags = await exiftool.read(file);

                // 优先读取拍摄时间(DateTimeOriginal)，其次是创建时间(CreateDate)，视频通常带有 MediaCreateDate
                const dateObj = tags.DateTimeOriginal || tags.CreateDate || tags.MediaCreateDate;

                if (dateObj && dateObj.toDate) {
                    // ExifTool 返回的日期对象带有 toDate() 方法
                    shootingTimeMs = dateObj.toDate().getTime();
                } else if (dateObj && typeof dateObj === 'string') {
                    // 如果是字符串格式，尝试解析
                    shootingTimeMs = new Date(dateObj).getTime();
                } else {
                    // 如果没有 EXIF 数据，降级使用文件系统的创建时间 (birthtime) 或修改时间 (mtime)
                    const stats = await fs.stat(file);
                    shootingTimeMs = stats.mtimeMs || stats.birthtimeMs;
                }
            } catch (err) {
                // 读取元数据失败（如文件损坏），降级使用系统文件时间
                const stats = await fs.stat(file);
                shootingTimeMs = stats.mtimeMs || stats.birthtimeMs;
            }

            fileInfos.push({
                path: file,
                time: shootingTimeMs
            });
        }

        // 3. 按时间从小到大（从旧到新）排序
        fileInfos.sort((a, b) => a.time - b.time);

        // 4. 返回纯路径数组
        return fileInfos.map(info => info.path);

    } finally {
        // 务必关闭 exiftool 的后台进程，防止内存泄漏
        await exiftool.end();
    }
}

async function main(options) {
    const targetFolder = path.resolve(options.path);

    console.log('正在读取并排序，请稍候...');

    // 参数1: 目录路径
    // 参数2: true 表示递归读取子目录，false 表示只读当前目录
    const sortedFiles = await getSortedMediaFiles(targetFolder,  options.recursive);
    console.log(`sortedFiles`, sortedFiles);
}

main({
    path: '/Users/ke/Downloads',
    recursive: true
})
