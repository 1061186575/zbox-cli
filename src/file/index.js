const { program } = require('commander');
const { question } = require("../utils");

const file = program.command('file');

// 文件随机重命名工具
file
    .command('rr') // randomRename
    .description('randomRename, 对指定路径里面的所有文件进行随机重命名，并且支持还原')
    .option('-p, --path <path>', '指定操作路径')
    .option('-a, --action <action>', '指定操作 (1: rename, 2: restore)')
    .option('-r, --recordFileName <recordFileName>', '指定记录文件名')
    .option('-b, --base64', '是否对文件内容进行 base64 编码/解码', false)
    .option('--ext', '是否保留文件扩展名', false)
    .action(options => {
        const randomRename = require('./randomRename')
        randomRename(options.path, options.action, options.recordFileName, options.base64, options.ext)
    })

// 文件加密解密工具
file
    .command('en') // encrypt
    .description('encrypt, 加密文件或目录')
    .argument('<input>', '要加密的文件或目录路径')
    .option('-o, --output <path>', '输出路径（默认：原路径 + .encrypted）')
    .option('-e, --extension <ext>', '加密文件后缀（默认：.encrypted）', '.encrypted')
    .option('--no-recursive', '不递归处理子目录')
    .option('--overwrite', '覆盖已存在的文件')
    .action(async (input, options) => {
        const key = await question('加密密钥:')
        await require('./fileEncryptor').encryptCLI(input, key, options);
        console.log('✅ 加密完成！');
    });
file
    .command('de') // decrypt
    .description('decrypt, 解密文件或目录')
    .argument('<input>', '要解密的文件或目录路径')
    .option('-o, --output <path>', '输出路径（默认：移除 .encrypted 后缀）')
    .option('-e, --extension <ext>', '加密文件后缀（默认：.encrypted）', '.encrypted')
    .option('--no-recursive', '不递归处理子目录')
    .option('--overwrite', '覆盖已存在的文件')
    .action(async (input, options) => {
        const key = await question('加密密钥:')
        await require('./fileEncryptor').decryptCLI(input, key, options);
        console.log('✅ 解密完成！');
    });


// 用 nodejs 下载 m3u8 文件
file
    .command('nodejsDownloadM3u8')
    .description('用 nodejs 下载 m3u8 文件')
    .action(require('./nodejsDownloadM3u8'))


// 用 ffmpeg 下载 m3u8 文件
file
    .command('ffmpegDownloadM3u8')
    .description('用 ffmpeg 下载 m3u8 文件')
    .option('-u, --url <url>', 'index.m3u8 文件地址')
    .option('-s, --saveFilename <saveFilename>', '指定下载的文件名称')
    .option('-i, --inputFile <inputFile>', '从指定文件获取 index.m3u8 文件地址/文件名称/下载目录, 可以批量下载')
    .option('--saveDir <saveDir>', '指定下载目录', 'ffmpegDownloadOutput')
    .option('--ffmpegFile <ffmpegFile>', '指定 ffmpeg 可执行文件')
    .option('--maxConcurrentTasks <maxConcurrentTasks>', '设置最大并发下载数量(m3u8 片段)', '3')
    .option('-p, --printInputFileTemplate', '打印 inputFile 参数对应的文件模板')
    .action(require('./ffmpegDownloadM3u8'))

