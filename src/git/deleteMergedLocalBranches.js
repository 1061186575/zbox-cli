const { execSync } = require('child_process');
const readline = require('readline');

// 创建 readline 接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 获取所有本地分支
function getLocalBranches() {
    const branchesOutput = execSync('git branch --format="%(refname:short)"').toString();
    return branchesOutput.split('\n').filter(branch => branch.trim() && branch !== 'master');
}

// 检查分支是否已合并到 master
function isBranchMergedToMaster(branch) {
    try {
        // 获取分支有而master没有的提交
        const diffOutput = execSync(`git log master..${branch} --oneline`).toString();
        return diffOutput.trim() === '';
    } catch (error) {
        console.error(`检查分支 ${branch} 时出错:`, error.message);
        return false;
    }
}

// 删除分支
function deleteBranch(branch) {
    try {
        execSync(`git branch -d ${branch}`);
        console.log(`已删除分支: ${branch}`);
        return true;
    } catch (error) {
        console.error(`删除分支 ${branch} 失败:`, error.message);
        return false;
    }
}

// 主函数
async function main() {
    console.log('正在检查哪些本地分支已完全合并到 master...');

    const localBranches = getLocalBranches();
    const branchesToDelete = [];

    // 检查每个分支
    for (const branch of localBranches) {
        if (isBranchMergedToMaster(branch)) {
            branchesToDelete.push(branch);
        }
    }

    if (branchesToDelete.length === 0) {
        console.log('没有找到可以删除的本地分支。');
        process.exit(0);
    }

    console.log('\n以下分支已完全合并到 master，可以安全删除:');
    branchesToDelete.forEach((branch, index) => {
        console.log(`${index + 1}. ${branch}`);
    });

    // 询问用户确认
    const answer = await new Promise(resolve => {
        rl.question('\n确定要删除这些分支吗？(y/N) ', resolve);
    });

    if (answer.toLowerCase() === 'y') {
        console.log('开始删除分支...');
        branchesToDelete.forEach(branch => {
            deleteBranch(branch);
        });
    } else {
        console.log('操作已取消。');
    }

    rl.close();
}

module.exports = main
