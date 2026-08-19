const { program } = require('commander');

const git = program.command('git');

git.description('执行 git 操作');

git
    .command('qa')
    .description('QA 分支发布工具，先合并 master 到当前分支, 然后合并当前分支到 QA 分支')
    .option('-b, --branch <branch>', '指定 qa 分支名称', 'qa')
    .option('-m, --master <master>', '指定 master 分支名称', 'master')
    .option('--noMergeMaster', '不合并 master 到当前分支', false)
    .action(options => {
        require('./qaRelease')(options.branch, options.master, options.noMergeMaster);
    });

git
    .command('deleteBranch')
    .description('安全删除本地分支中已经合并到 master 的分支, 减少多余分支数量')
    .action(() => {
        require('./deleteMergedLocalBranches')();
    });

git
    .command('mr')
    .description('创建 Gitlab 合并请求, 会一次查找所有项目下的指定分支(避免遗漏)来创建 Merge 合并请求, 自动填写合并标题')
    .option('-c, --configPath <path>', '指定配置文件路径，不指定时向上查找 newMergeRequestConfig.json')
    .option('-p, --printConfigTemplate', '输出 newMergeRequestConfig.json 模板文件')
    .action(options => {
        require('./newMergeRequest')(options);
    });
