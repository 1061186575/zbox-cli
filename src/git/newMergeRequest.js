const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');
const { execFile, execFileSync, spawn, execSync } = require('child_process');
const execFileAsync = promisify(execFile);
const redText = text => `\x1b[31m${text}\x1b[0m`;

const configTemplate = `{
    "gitlabUrl": "https://gitlab.xxx.com",
    "projectParentPath": "/Users/admin/project",
    "projectList": [
        {
            "name": "test1", // gitlab 仓库项目名称
            "targetBranch": "main", // 默认是 master
            "projectPath": "/Users/admin/project/otherName" // 默认用 projectParentPath + name 作为 projectPath
        },
        {
            "name": "test2",
            "targetBranch": "main"
        },
        {
            "name": "test3",
            "gitlabUrl": "https://gitlab.com/home"
        }
    ]
}`

function getProjectConfig(configPath) {
    let config = {};
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        config.error = error;
    }
    /*
    {
        "projectParentPath": "/Users/admin/project",
        "projectList": [
            {
                "name": "test1", // git 仓库项目名称
                "targetBranch": "master", // 默认是 master
                "projectPath": "/Users/admin/project/otherName" // 如果有 projectPath 就用 projectPath, 否则用 projectParentPath + name 作为 projectPath
            },
            {
                "name": "test2",
                "targetBranch": "main"
            },
            {
                "name": "test3",
                "targetBranch": "master"
            }
        ]
    }
     */
    config.projectList = Array.isArray(config.projectList) ? config.projectList : [];
    return config
}

function findDefaultConfigPath(defaultConfigPath) {
    let currentDir = process.cwd();
    const rootDir = path.parse(currentDir).root;

    while (true) {
        const configPath = path.join(currentDir, defaultConfigPath);

        if (fs.existsSync(configPath)) {
            return configPath;
        }

        if (currentDir === rootDir) {
            return '';
        }

        currentDir = path.dirname(currentDir);
    }
}

function getConfigPath(optionsConfigPath, defaultConfigPath) {
    if (optionsConfigPath) {
        return path.resolve(optionsConfigPath);
    }
    return findDefaultConfigPath(defaultConfigPath);
}

function getUrl(sourceBranch, title, item, gitlabUrl) {
    const {
        id = '',
        name,
        targetBranch = "master",
    } = item;
    gitlabUrl = item.gitlabUrl || gitlabUrl;
    return encodeURI(`${gitlabUrl}/${name}/-/merge_requests/new?merge_request[source_project_id]=${id}&merge_request[source_branch]=${sourceBranch}&merge_request[target_project_id]=${id}&merge_request[target_branch]=${targetBranch}&merge_request[title]=${title}`)
}

function isDirectory(dir) {
    try {
        return fs.statSync(dir).isDirectory();
    } catch (error) {
        return false;
    }
}

function hasRef(projectPath, ref) {
    try {
        execFileSync('git', ['-C', projectPath, 'show-ref', '--verify', '--quiet', ref], {
            stdio: 'ignore'
        });
        return true;
    } catch (error) {
        return false;
    }
}

function hasLocalBranch(projectPath, branchName) {
    return hasRef(projectPath, `refs/heads/${branchName}`);
}

function hasRemoteBranch(projectPath, branchName) {
    return hasRef(projectPath, `refs/remotes/origin/${branchName}`);
}

function hasBranch(projectPath, branchName) {
    return hasLocalBranch(projectPath, branchName) || hasRemoteBranch(projectPath, branchName);
}

function getProjectCurrentBranch(projectPath) {
    try {
        return execFileSync('git', ['-C', projectPath, 'branch', '--show-current'], {
            encoding: 'utf8'
        }).trim();
    } catch (error) {
        return '';
    }
}

function getWorkingTreeChanges(projectPath) {
    try {
        return execFileSync('git', ['-C', projectPath, 'status', '--porcelain'], {
            encoding: 'utf8'
        }).trim();
    } catch (error) {
        return '';
    }
}

function getUnpushedCommitCount(projectPath, branchName) {
    return Number(execFileSync('git', [
        '-C',
        projectPath,
        'rev-list',
        '--count',
        `origin/${branchName}..${branchName}`
    ], {
        encoding: 'utf8'
    }).trim());
}

function getProjectWarnings(projectPath, branchName) {
    if (!hasLocalBranch(projectPath, branchName)) {
        return [];
    }

    const warnings = [];
    const projectName = path.basename(projectPath);

    if (getProjectCurrentBranch(projectPath) === branchName && getWorkingTreeChanges(projectPath)) {
        warnings.push(`${projectName}: 当前分支 ${branchName} 存在未 commit 的代码，请提交并 push 后再确认上线范围`);
    }

    if (!hasRemoteBranch(projectPath, branchName)) {
        warnings.push(`${projectName}: 本地分支 ${branchName} 尚未 push 到 origin，Merge Request 无法包含该分支代码`);
        return warnings;
    }

    try {
        const unpushedCommitCount = getUnpushedCommitCount(projectPath, branchName);
        if (unpushedCommitCount > 0) {
            warnings.push(`${projectName}: 本地分支 ${branchName} 有 ${unpushedCommitCount} 个 commit 尚未 push，Merge Request 不会包含这些代码`);
        }
    } catch (error) {
        warnings.push(`${projectName}: 无法检查 ${branchName} 是否存在未 push 的 commit，请手动确认`);
    }

    return warnings;
}

function printWarnings(warnings) {
    if (!warnings.length) {
        return;
    }

    console.error(redText(`\n警告：以下代码可能未包含在 Merge Request 中：\n${warnings.map(warning => `- ${warning}`).join('\n')}`));
}

async function fetchBranch(projectPath, branchName) {
    try {
        await execFileAsync('git', [
            '-C',
            projectPath,
            'fetch',
            'origin',
            `refs/heads/${branchName}:refs/remotes/origin/${branchName}`
        ], {
            stdio: 'ignore'
        });
        return true;
    } catch (error) {
        return false;
    }
}

function getBranchRef(projectPath, branchName) {
    try {
        execFileSync('git', ['-C', projectPath, 'show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], {
            stdio: 'ignore'
        });
        return branchName;
    } catch (error) {
        return `origin/${branchName}`;
    }
}

function getCurrentBranch() {
    try {
        return execSync(`git branch --show-current`, {
            encoding: 'utf8',
        }).trim();
    } catch (error) {
        // console.log(`error`, error);
        return '';
    }
}

function getFirstCommitMsg(projectPath, sourceBranch) {
    const baseBranchRef = getBranchRef(projectPath, 'master');
    const sourceBranchRef = getBranchRef(projectPath, sourceBranch);
    const logOutput = execFileSync('git', ['-C', projectPath, 'log', '--reverse', '--format=%s', `${baseBranchRef}..${sourceBranchRef}`], {
        encoding: 'utf8'
    });

    return logOutput.split('\n')[0].trim();
}

function openUrl(url) {
    const platformOpenCommands = {
        darwin: ['open', [url]],
        linux: ['xdg-open', [url]],
        win32: ['cmd', ['/c', 'start', '', url]]
    };
    const [command, args] = platformOpenCommands[process.platform] || platformOpenCommands.linux;
    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
    });

    child.on('error', error => {
        console.error(`打开浏览器失败: ${error.message}`);
    });
    child.unref();
}

function question(text) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(text, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main(options = {}) {
    if (options.printConfigTemplate) {
        console.log('建议把配置文件放到所有项目的父路径\nnewMergeRequestConfig.json');
        console.log(configTemplate);
        return;
    }
    const defaultConfigPath = 'newMergeRequestConfig.json';
    const configPath = getConfigPath(options.configPath, defaultConfigPath);

    if (!configPath) {
        console.error(`未找到配置文件 ${defaultConfigPath}，请使用 -c 参数指定配置文件路径`);
        return;
    }

    const { gitlabUrl, projectParentPath, projectList = [], error } = getProjectConfig(configPath);

    if (!projectList.length) {
        if (error) {
            console.error(`读取配置文件失败: ${error.message}`);
        } else {
            console.log('项目列表 projectList 不能为空');
        }
        return;
    }

    const defaultSourceBranch = getCurrentBranch();
    const sourceBranch = options.sourceBranch ? options.sourceBranch : (await question(`开发分支名称${defaultSourceBranch ? `(${defaultSourceBranch})` : ''}: `) || defaultSourceBranch);

    if (!sourceBranch) {
        console.error('sourceBranch 不能为空');
        return;
    }
    if (sourceBranch === 'qa' || sourceBranch.startsWith('qa_')) {
        console.error('sourceBranch 不能是 qa 分支 或 qa_ 开头的分支');
        return;
    }

    let title = options.title;
    let findOne = false;
    const projects = [];
    const warnings = [];

    for(let i = 0; i < projectList.length; i++) {
        const item = projectList[i];

        if (!item.name) {
            if (item.projectPath) {
                item.name = path.parse(item.projectPath).name
            } else {
                console.log(`项目列表 ${i + 1} 缺少 name 属性:`, item);
                continue;
            }
        }

        const projectPath = path.resolve(item.projectPath || path.join(projectParentPath, item.name));

        if (!isDirectory(projectPath)) {
            console.error(`${projectPath} 路径不是一个目录`);
            continue;
        }

        projects.push({ item, projectPath });
    }

    if (options.fetchBranch) {
        await Promise.all(projects.map(({ projectPath }) => fetchBranch(projectPath, sourceBranch)));
    }

    for (const { item, projectPath } of projects) {
        warnings.push(...getProjectWarnings(projectPath, sourceBranch));

        if (!hasBranch(projectPath, sourceBranch)) {
            continue;
        }

        let firstCommitMsg = '';
        if (!title) {
            firstCommitMsg = getFirstCommitMsg(projectPath, sourceBranch) || sourceBranch;
            title = await question(`合并标题(${firstCommitMsg}): `) || firstCommitMsg;
        }

        const url = getUrl(sourceBranch, title || firstCommitMsg, item, gitlabUrl);
        console.log(projectPath, url);
        openUrl(url);
        findOne = true;
    }

    if (!findOne) {
        console.log(`${projectList.map(item => item.name).join('、')} 项目没有找到 ${sourceBranch} 分支`);
    }

    printWarnings(warnings);
}

module.exports = main;
module.exports.getProjectWarnings = getProjectWarnings;
module.exports.printWarnings = printWarnings;
