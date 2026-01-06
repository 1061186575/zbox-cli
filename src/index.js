const { program } = require('commander');

program
    .command('qa')
    .description('运行 QA 发布工具，合并当前分支到 QA 分支')
    .option('-b, --branch <branch>', '指定目标分支', 'qa')
    .option('-m, --master <master>', '指定 master 分支名称', 'master')
    .action(options => {
        const targetBranch = options.branch;
        const masterBranch = options.master;
        require('./utils/qaRelease')(targetBranch, masterBranch);
    });
