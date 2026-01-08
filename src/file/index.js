const { program } = require('commander');

const file = program.command('file');

// 文件随机重命名工具
file
    .command('rr')
    .option('-p, --path <path>', '指定操作路径')
    .option('-a, --action <action>', '指定操作 (1: rename, 2: restore)')
    .option('-r, --recordFileName <recordFileName>', '指定记录文件名')
    .option('-b, --base64', '是否对文件内容进行 base64 编码/解码', false)
    .option('--ext', '是否保留文件扩展名', false)
    .description('对指定路径里面的所有文件进行随机重命名，并且支持还原')
    .action(options => {
        const randomRename = require('./randomRename')
        randomRename(options.path, options.action, options.recordFileName, options.base64, options.ext)
    })

