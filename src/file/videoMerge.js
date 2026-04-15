const path = require('path');
const fs = require('fs');
const { spawnExec, question } = require('../utils');

// 支持的视频文件扩展名
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ts'];

/**
 * 视频合并主函数
 * @param {Object} options - 命令行选项
 */
async function videoMerge(options) {
    try {
        const targetDir = path.resolve(options.dir) || process.cwd();
        const sortBy = options.sort || 'name';
        // 如果没有指定输出路径，默认放在视频文件目录下
        const outputPath = options.output ? path.resolve(options.output) : path.join(targetDir, 'merged-video.mp4');
        const ffmpegPath = options.ffmpeg ? path.resolve(options.ffmpeg) : 'ffmpeg';
        const force = options.force || false;

        const keepVideoList = options.keepVideoList || false;

        // 验证目录是否存在
        if (!fs.existsSync(targetDir)) {
            console.error(`❌ 目录不存在: ${targetDir}`);
            return;
        }

        // 检查输出文件是否已存在（前置检查）
        if (fs.existsSync(outputPath)) {
            if (fs.statSync(outputPath).isDirectory()) {
                console.error(`❌ 输出路径错误, 不能是一个目录: ${outputPath}`);
                return;
            }
            if (force) {
                fs.unlinkSync(outputPath);
            } else {
                const overwrite = await question(`输出文件已存在: ${outputPath}\n是否覆盖? (y/n): `);
                if (overwrite.toLowerCase() !== 'y') {
                    console.log('❌ 操作取消');
                    return;
                }
                // 立即删除输出文件，避免在扫描时被包含
                fs.unlinkSync(outputPath);
            }
        }

        // 获取视频文件列表
        console.log(`📁 扫描目录: ${targetDir}`);
        const videoFiles = getVideoFiles(targetDir, sortBy);

        if (videoFiles.length === 0) {
            console.log('❌ 未找到任何视频文件');
            return;
        }

        console.log(`📹 找到 ${videoFiles.length} 个视频文件:`);
        videoFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.name} (${file.sizeStr})`);
        });

        // 检查 FFmpeg 是否可用
        await checkFFmpeg(ffmpegPath);

        if (!force) {
            const overwrite = await question(`是否继续? (y/n): `);
            if (overwrite.toLowerCase() !== 'y') {
                console.log('❌ 操作取消');
                return;
            }
        }

        // 生成文件列表
        const fileListPath = createFileList(videoFiles);

        try {
            // 执行合并
            console.log('🔄 开始合并视频...');
            console.log(`📤 输出文件: ${outputPath}`);

            await mergeVideos(ffmpegPath, fileListPath, outputPath);

            console.log('✅ 视频合并完成!');

            // 显示输出文件信息
            const totalInputSize = videoFiles.reduce((sum, file) => sum + file.size, 0);
            const inputSizeStr = formatFileSize(totalInputSize);
            console.log(`📊 合并前文件大小: ${inputSizeStr}`);

            const outputStats = fs.statSync(outputPath);
            const outputSize = formatFileSize(outputStats.size);
            console.log(`📊 合并后文件大小: ${outputSize}`);

        } finally {
            // 清理临时文件
            if (fs.existsSync(fileListPath)) {
                if (keepVideoList) {
                    console.log(`📝 保留文件列表: ${fileListPath}`);
                } else {
                    fs.unlinkSync(fileListPath);
                }
            }
        }

    } catch (error) {
        console.error('❌ 视频合并失败:', error.message);
        process.exit(1);
    }
}

/**
 * 获取目录下的所有视频文件并排序
 * @param {string} dirPath - 目录路径
 * @param {string} sortBy - 排序方式: name, ctime, mtime
 * @returns {Array} 视频文件信息数组
 */
function getVideoFiles(dirPath, sortBy) {
    const files = fs.readdirSync(dirPath);
    const videoFiles = [];

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        // 只处理文件，跳过目录
        if (!stats.isFile()) continue;

        // 检查是否为视频文件
        const ext = path.extname(file).toLowerCase();
        if (!VIDEO_EXTENSIONS.includes(ext)) continue;

        videoFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            sizeStr: formatFileSize(stats.size),
            ctime: stats.ctime,
            mtime: stats.mtime
        });
    }

    // 根据指定方式排序
    switch (sortBy) {
        case 'ctime':
            videoFiles.sort((a, b) => a.ctime - b.ctime);
            console.log('📅 按创建时间排序');
            break;
        case 'mtime':
            videoFiles.sort((a, b) => a.mtime - b.mtime);
            console.log('📅 按修改时间排序');
            break;
        case 'name':
        default:
            videoFiles.sort((a, b) => a.name.localeCompare(b.name));
            console.log('📅 按文件名排序');
            break;
    }

    return videoFiles;
}

/**
 * 检查 FFmpeg 是否可用
 * @param {string} ffmpegPath - FFmpeg 路径
 */
async function checkFFmpeg(ffmpegPath) {
    try {
        await spawnExec(ffmpegPath, ['-version'], { stdio: 'pipe' });
        console.log('✅ FFmpeg 可用');
    } catch (error) {
        throw new Error(`FFmpeg 不可用: ${ffmpegPath}\n请确保已安装 FFmpeg 并正确配置路径`);
    }
}

/**
 * 创建 FFmpeg 文件列表
 * @param {Array} videoFiles - 视频文件数组
 * @returns {string} 文件列表路径
 */
function createFileList(videoFiles) {
    const listContent = videoFiles.map(file => `file '${file.path.replace(/'/g, "'\\''")}'`).join('\n');
    const listPath = path.join(process.cwd(), `video_list_${Date.now()}.txt`);

    fs.writeFileSync(listPath, listContent, 'utf8');
    console.log(`📝 创建文件列表: ${listPath}`);

    return listPath;
}

/**
 * 使用 FFmpeg 合并视频
 * @param {string} ffmpegPath - FFmpeg 路径
 * @param {string} fileListPath - 文件列表路径
 * @param {string} outputPath - 输出路径
 */
async function mergeVideos(ffmpegPath, fileListPath, outputPath) {
    const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', fileListPath,
        '-c', 'copy',
        '-y', // 覆盖输出文件
        outputPath
    ];

    console.log('🎬 执行 FFmpeg 命令...');
    console.log(`${ffmpegPath} ${args.join(' ')}`);

    await spawnExec(ffmpegPath, args, { stdio: 'inherit' });
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

module.exports = videoMerge;
