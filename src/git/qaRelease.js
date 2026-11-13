/*

功能: 更新和合并分支
假设当前分支是 dev_test
1. 更新 master 并合入到 dev_test, push dev_test 分支
2. 更新 qa 并切换到 qa 分支, 把 dev_test 分支合并到 qa 分支, push qa 分支, 切换回 dev_test 分支

运行之前请尽量保证工作区干净
如果遇到无法自动处理的冲突, 会打印报错并合并失败, 需要手动合并

 */

const { execSync } = require('child_process');
const defaultMasterBranch = 'master'; // master or main

async function main(options) {
    const targetBranch = options.branch;
    const masterBranch = options.master || defaultMasterBranch;
    const noMergeMaster = options.noMergeMaster;
    const noAbortOnConflict = options.noAbortOnConflict;

    console.time('总运行耗时');
    const curBranch = execSync(`git branch --show-current`).toString().trim();

    console.log(`当前分支`, curBranch);
    console.log(`目标分支`, targetBranch);

    if (curBranch === targetBranch) {
        console.log('分支一致, 无需处理');
        return;
    }

    // 先刷新目标分支, 再检查当前分支的代码是否已经包含在目标分支中
    execSync(`git fetch origin refs/heads/${targetBranch}:refs/heads/${targetBranch} --recurse-submodules=no --progress`);
    const ahead = execSync(`git rev-list --left-right --count refs/heads/${targetBranch}...refs/heads/${curBranch}`).toString().trim();
    const [, aheadCount] = ahead.split('\t').map(Number);
    if (aheadCount === 0) {
        console.log(`当前分支 ${curBranch} 的代码已经包含在 ${targetBranch} 分支中, 无需发布`);
        return;
    }

    const mergeAbort = 'git merge --abort';
    const cmdList = [];
    const cmdMergeMaster = [
        `git fetch origin refs/heads/${masterBranch}:refs/heads/${masterBranch} --recurse-submodules=no --progress`,
        `git merge refs/heads/${masterBranch}`,
        `git push origin refs/heads/${curBranch}:${curBranch}`,
    ]

    if (!noMergeMaster) {
        cmdList.push(...cmdMergeMaster);
    }

    cmdList.push(
        `git checkout ${targetBranch}`,
        `git merge refs/heads/${curBranch}`,
        `git push origin refs/heads/${targetBranch}:${targetBranch}`,
        `git checkout ${curBranch}`,
    );
    // console.log(`cmdList`, cmdList);

    for (const cmd of cmdList) {
        console.log('\n' + '-'.repeat(100));
        console.log(cmd, '\n');
        try {
            let res = execSync(cmd);
            if (res.toString()) {
                console.log(res.toString());
            }
        } catch (e) {
            if (e.stdout.toString()) {
                console.log('报错信息:', e.stdout.toString());
            }
            if (e.stderr.toString()) {
                console.log('报错信息:', e.stderr.toString());
            }
            console.log(`命令 ${cmd} 执行失败, 请手动发布到 ${targetBranch} 分支`);
            if (cmd.startsWith('git merge ')) {
                if (!noAbortOnConflict) {
                    execSync(mergeAbort);
                    console.log(`已执行: ${mergeAbort}`);
                }
                console.log('检测到存在合并冲突, 请先手动解决冲突');
            }
            return;
        }
    }
    console.timeEnd('总运行耗时');
    console.log('当前时间', new Date().toLocaleString());
    console.log('\x1b[42;30m DONE \x1b[40;32m ' + `发布到 ${targetBranch} 分支成功!` + '\x1b[0m');
    return true;
}

module.exports = main;
