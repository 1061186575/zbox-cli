const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');

/**
 * 把 SOURCE_DIR 里面的文件按更新时间排序, 然后分类放到 TARGET_DIR 里面,
 * 同时确保 TARGET_DIR 里面的子目录 文件数量 <= MAX_FILE_COUNT && 大小 <= MAX_TOTAL_SIZE_GB
 * @type {string}
 */

// 配置参数
const SOURCE_DIR = 'D:\\SOURCE_DIR';
const TARGET_DIR = 'D:\\TARGET_DIR';
const SUB_DIR_NAME = 'dir';
const MAX_FILE_COUNT = 500;
const MAX_TOTAL_SIZE_GB = 4;
const isRename = true // rename or copy

async function main() {
    try {
        console.log('开始文件分类处理...');

        // 检查源目录是否存在
        if (!existsSync(SOURCE_DIR)) {
            console.error(`源目录不存在: ${SOURCE_DIR}`);
            return;
        }

        // 创建目标目录
        await fs.mkdir(TARGET_DIR, { recursive: true });
        console.log(`目标目录已创建: ${TARGET_DIR}`);

        // 获取所有文件并统计信息
        const files = await getAllFiles(SOURCE_DIR);
        console.log(`找到 ${files.length} 个文件`);

        // 按更新时间排序（最新的优先）
        files.sort((a, b) => b.mtimeMs - a.mtimeMs);

        // 分类处理文件
        await classifyFiles(files);

        console.log('文件分类完成！');
    } catch (error) {
        console.error('处理过程中发生错误:', error);
    }
}

async function getAllFiles(dirPath, allFiles = []) {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
            // 递归处理子目录
            await getAllFiles(fullPath, allFiles);
        } else {
            // 获取文件信息
            const stats = await fs.stat(fullPath);
            allFiles.push({
                path: fullPath,
                name: item.name,
                size: stats.size,
                mtimeMs: stats.mtimeMs,
                mtime: stats.mtime
            });
        }
    }

    return allFiles;
}

async function classifyFiles(files) {
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
            await createAndCopyBatch(currentBatch, currentDirIndex);

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
        await createAndCopyBatch(currentBatch, currentDirIndex);
    }
}

async function createAndCopyBatch(batch, dirIndex) {
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

// 运行程序
main();
