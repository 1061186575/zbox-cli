const { program } = require('commander');

const file = program.command('file');

// 文件随机重命名工具
file
    .command('renameRandom')
    .option('-p, --path <path>', '指定操作路径')
    .option('-a, --action <action>', '指定操作 (1: rename, 2: restore)')
    .option('-r, --recordFileName <recordFileName>', '指定记录文件名')
    .option('-e, --ext', '是否保留文件扩展名', false)
    .description('对指定路径里面的所有文件进行随机重命名，并且支持还原')
    .action(options => {
        const renameRandom = require('./renameRandom')
        renameRandom(options.path, options.action, options.recordFileName, options.ext)
    })

