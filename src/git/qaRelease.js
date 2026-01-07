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

async function main(targetBranch, masterBranch = defaultMasterBranch) {
    console.time('总运行耗时');
    const curBranch = execSync(`git branch --show-current`).toString().trim();

    console.log(`当前分支`, curBranch);
    console.log(`目标分支`, targetBranch);

    if (curBranch === targetBranch) {
        console.log('分支一致, 无需处理');
        return;
    }

    const mergeAbort = 'git merge --abort';

    const cmdList = [
        `git fetch origin refs/heads/${masterBranch}:refs/heads/${masterBranch} --recurse-submodules=no --progress`,
        `git merge refs/heads/${masterBranch}`,
        `git push origin refs/heads/${curBranch}:${curBranch}`,

        `git fetch origin refs/heads/${targetBranch}:refs/heads/${targetBranch} --recurse-submodules=no --progress`,
        `git checkout ${targetBranch}`,
        `git merge refs/heads/${curBranch}`,
        `git push origin refs/heads/${targetBranch}:${targetBranch}`,

        `git checkout ${curBranch}`,
    ];

    for (let i = 0; i < cmdList.length; i++) {
        let cmd = cmdList[i];
        console.log('\n' + '-'.repeat(100));
        console.log(cmd, '\n');
        try {
            let res = await execSync(cmd);
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
                await execSync(mergeAbort);
                console.log('检测到存在合并冲突, 请先手动解决冲突');
            }
            return;
        }
    }
    console.timeEnd('总运行耗时');
    console.log('当前时间', new Date().toLocaleString());
    console.log('\x1b[42;30m DONE \x1b[40;32m ' + `发布到 ${targetBranch} 分支成功!` + '\x1b[0m');
}


module.exports = main;
