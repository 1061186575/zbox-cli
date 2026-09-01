const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { getProjectWarnings, printWarnings } = require('../../src/git/newMergeRequest');

function git(projectPath, args) {
    return execFileSync('git', ['-C', projectPath, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
}

describe('newMergeRequest warnings', () => {
    let tempPath;
    let remotePath;
    let projectPath;

    beforeEach(() => {
        tempPath = fs.mkdtempSync(path.join(os.tmpdir(), 'zbox-new-mr-'));
        remotePath = path.join(tempPath, 'remote.git');
        projectPath = path.join(tempPath, 'project');

        execFileSync('git', ['init', '--bare', remotePath], { stdio: 'ignore' });
        execFileSync('git', ['clone', remotePath, projectPath], { stdio: 'ignore' });
        git(projectPath, ['config', 'user.email', 'zbox@example.com']);
        git(projectPath, ['config', 'user.name', 'zbox']);
        git(projectPath, ['checkout', '-b', 'feature']);
        fs.writeFileSync(path.join(projectPath, 'feature.txt'), 'first commit\n');
        git(projectPath, ['add', 'feature.txt']);
        git(projectPath, ['commit', '-m', 'first commit']);
        git(projectPath, ['push', '-u', 'origin', 'feature']);
    });

    afterEach(() => {
        fs.rmSync(tempPath, { recursive: true, force: true });
        jest.restoreAllMocks();
    });

    test('warns when local commits are not pushed', () => {
        fs.appendFileSync(path.join(projectPath, 'feature.txt'), 'second commit\n');
        git(projectPath, ['add', 'feature.txt']);
        git(projectPath, ['commit', '-m', 'second commit']);

        expect(getProjectWarnings(projectPath, 'feature')).toContain(
            'project: 本地分支 feature 有 1 个 commit 尚未 push，Merge Request 不会包含这些代码'
        );
    });

    test('warns when current source branch has uncommitted changes', () => {
        fs.appendFileSync(path.join(projectPath, 'feature.txt'), 'not committed\n');

        expect(getProjectWarnings(projectPath, 'feature')).toContain(
            'project: 当前分支 feature 存在未 commit 的代码，请提交并 push 后再确认上线范围'
        );
    });

    test('warns when local branch has not been pushed to origin', () => {
        git(projectPath, ['checkout', '-b', 'local-only']);

        expect(getProjectWarnings(projectPath, 'local-only')).toEqual([
            'project: 本地分支 local-only 尚未 push 到 origin，Merge Request 无法包含该分支代码'
        ]);
    });

    test('prints all warnings in red', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        printWarnings(['project: warning']);

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('\x1b[31m'));
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('- project: warning'));
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('\x1b[0m'));
    });
});
