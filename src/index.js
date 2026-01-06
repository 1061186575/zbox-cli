const { program } = require('commander');

const git = program.command('git');

git
    .command('qa')
    .description('运行 QA 发布工具，合并当前分支到 QA 分支')
    .option('-b, --branch <branch>', '指定目标分支', 'qa')
    .option('-m, --master <master>', '指定 master 分支名称', 'master')
    .action(options => {
        const targetBranch = options.branch;
        const masterBranch = options.master;
        require('./utils/qaRelease')(targetBranch, masterBranch);
    });

git
    .command('deleteBranch')
    .description('安全删除本地分支中已经合并到 master 的分支, 减少多余分支数量')
    .action(() => {
        require('./utils/deleteMergedLocalBranches')();
    });
