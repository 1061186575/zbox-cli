const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');
const { question } = require("../utils");

/**
 * 把 SOURCE_DIR 里面的文件按更新时间排序, 然后分类放到 TARGET_DIR 里面,
 * 同时确保 TARGET_DIR 里面的子目录 文件数量 <= MAX_FILE_COUNT && 大小 <= MAX_TOTAL_SIZE_GB
 * @type {string}
 */

// 配置参数
let TARGET_DIR = '';
const MAX_FILE_COUNT = 500;
const MAX_TOTAL_SIZE_GB = 4;
const isRename = true // rename or copy

// main({
//     dir: 'F:\\backup\\lianlisha_iPhone15_plus_202411_20250514',
//     output: 'F:\\backup\\lianlisha_iPhone15_plus_202411_20250514',
//     exifGroup: true,
//     sort: 'exif'
// })

async function main(options) {
    try {
        const SOURCE_DIR = path.resolve(options.dir);
        TARGET_DIR = path.resolve(options.output || options.dir);
        const recursive = true;
        const sort = options.sort;
        const exifGroup = sort === 'exif' && options.exifGroup;
        const SUB_DIR_NAME = 'dir';

        console.log('SOURCE_DIR', SOURCE_DIR)
        console.log('TARGET_DIR', TARGET_DIR)
        console.log('递归处理子目录:', recursive)
        console.log('排序方式:', sort)

        if ((await question('请确认以上信息, 是否继续?(y/N) ')).trim() !== 'y') {
            return;
        }
        console.log('开始文件分类处理...');

        // 检查源目录是否存在
        if (!existsSync(SOURCE_DIR)) {
            console.error(`源目录不存在: ${SOURCE_DIR}`);
            return;
        }

        if (!existsSync(TARGET_DIR)) {
            // 创建目标目录
            await fs.mkdir(TARGET_DIR, { recursive: true });
            console.log(`目标目录已创建: ${TARGET_DIR}`);
        }

        // 获取所有文件并统计信息
        const files = await getAllFiles(SOURCE_DIR, recursive);
        console.log(`找到 ${files.length} 个文件`);

        if (sort === 'exif') {
            // 按拍摄时间从旧到新排序
            await addShootingTime(files, exifGroup)
            files.sort((a, b) => a.shootingTimeMs - b.shootingTimeMs);
        } else if (sort === 'mtime') {
            files.sort((a, b) => a.mtimeMs - b.mtimeMs);
        } else if (sort === 'ctime') {
            files.sort((a, b) => a.ctimeMs - b.ctimeMs);
        } else if (sort === 'birthtime') {
            files.sort((a, b) => a.birthtimeMs - b.birthtimeMs);
        } else {
            files.sort((a, b) => a.name.localeCompare(b.name));
        }

        if (exifGroup) {
            await classifyFiles(files.filter(d => d.shootingTimeMs !== 0), SUB_DIR_NAME);
            await classifyFiles(files.filter(d => d.shootingTimeMs === 0), `${SUB_DIR_NAME}_没有拍摄时间`);
        } else {
            await classifyFiles(files, SUB_DIR_NAME);
        }

        console.log('文件分类完成！');
    } catch (error) {
        console.error('处理过程中发生错误:', error);
    }
}

// 遍历读取每个文件的拍摄时间
async function addShootingTime(files, exifGroup = false) {
    const { ExifTool } = require("exiftool-vendored");
    const exiftool = new ExifTool();

    try {
        // 可以使用 Promise.all 并发读取，但为了避免占用过多内存，当前使用 for...of 串行读取
        for (const file of files) {
            let shootingTimeMs = 0;

            try {
                const tags = await exiftool.read(file.path);

                // 优先读取拍摄时间(DateTimeOriginal)，其次是创建时间(CreateDate)，视频通常带有 MediaCreateDate
                const dateObj = tags.DateTimeOriginal || tags.CreateDate || tags.MediaCreateDate;

                if (dateObj && dateObj.toDate) {
                    // ExifTool 返回的日期对象带有 toDate() 方法
                    shootingTimeMs = dateObj.toDate().getTime();
                } else if (dateObj && typeof dateObj === 'string') {
                    // 如果是字符串格式，尝试解析
                    shootingTimeMs = new Date(dateObj).getTime();
                } else {
                    if (exifGroup) {
                        shootingTimeMs = 0;
                    } else {
                        // 如果没有 EXIF 数据，降级使用文件系统的时间
                        shootingTimeMs = file.mtimeMs || file.ctimeMs;
                    }
                }
            } catch (err) {
                // 读取元数据失败（如文件损坏），降级使用系统文件时间
                if (exifGroup) {
                    shootingTimeMs = 0;
                } else {
                    // 如果没有 EXIF 数据，降级使用文件系统的时间
                    shootingTimeMs = file.mtimeMs || file.ctimeMs;
                }
            }

            file.shootingTimeMs = shootingTimeMs;
        }

        return files;

    } finally {
        // 务必关闭 exiftool 的后台进程，防止内存泄漏
        await exiftool.end();
    }
}

async function getAllFiles(dirPath, recursive, allFiles = []) {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
            if (recursive) {
                // 递归处理子目录
                await getAllFiles(fullPath, recursive, allFiles);
            }
        } else {
            // 获取文件信息
            const stats = await fs.stat(fullPath);
            allFiles.push({
                path: fullPath,
                name: item.name,
                size: stats.size,
                mtimeMs: stats.mtimeMs,
                ctimeMs: stats.ctimeMs,
                birthtimeMs: stats.birthtimeMs,
            });
        }
    }

    return allFiles;
}

async function classifyFiles(files, SUB_DIR_NAME) {
    let currentDirIndex = 1;
    let currentBatch = {
        files: [],
        totalSize: 0,
        fileCount: 0
    };

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 检查是否达到限制条件
        if (currentBatch.fileCount >= MAX_FILE_COUNT ||
            (currentBatch.totalSize + file.size) > MAX_TOTAL_SIZE_GB * 1024 * 1024 * 1024) {

            // 创建当前批次的目录并复制文件
            await createAndCopyBatch(currentBatch, currentDirIndex, SUB_DIR_NAME);

            // 重置批次并增加目录索引
            currentBatch = {
                files: [],
                totalSize: 0,
                fileCount: 0
            };
            currentDirIndex++;
        }

        // 添加文件到当前批次
        currentBatch.files.push(file);
        currentBatch.totalSize += file.size;
        currentBatch.fileCount++;

        // 显示进度
        if (i % 100 === 0 || i === files.length - 1) {
            console.log(`处理进度: ${i + 1}/${files.length} 个文件`);
        }
    }

    // 处理最后一批文件
    if (currentBatch.fileCount > 0) {
        await createAndCopyBatch(currentBatch, currentDirIndex, SUB_DIR_NAME);
    }
}

async function createAndCopyBatch(batch, dirIndex, SUB_DIR_NAME) {
    const dirName = `${SUB_DIR_NAME}${dirIndex}`;
    const targetDirPath = path.join(TARGET_DIR, dirName);

    console.log(`\n创建目录 ${dirName}:`);
    console.log(`  文件数量: ${batch.fileCount}`);
    console.log(`  总大小: ${formatFileSize(batch.totalSize)}`);

    // 创建目标目录
    await fs.mkdir(targetDirPath, { recursive: true });

    // 复制所有文件
    for (const file of batch.files) {
        const targetPath = path.join(targetDirPath, file.name);

        try {
            // 如果目标文件已存在，添加后缀避免覆盖
            let finalTargetPath = targetPath;
            let counter = 1;

            while (existsSync(finalTargetPath)) {
                const ext = path.extname(file.name);
                const nameWithoutExt = path.basename(file.name, ext);
                finalTargetPath = path.join(targetDirPath, `${nameWithoutExt}_${counter}${ext}`);
                counter++;
            }

            if (isRename) {
                await fs.rename(file.path, finalTargetPath, (err) => {
                    if (err) console.log('err', err);
                });
            } else {
                await fs.copyFile(file.path, finalTargetPath);
            }
        } catch (error) {
            console.error(`  复制文件失败: ${file.name}`, error.message);
        }
    }

    console.log(`  目录 ${dirName} 创建完成\n`);
}

function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

module.exports = main;
