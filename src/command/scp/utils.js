const { execSync, spawn } = require("child_process");
const readline = require("readline");

function getGitCommit() {
    let res = ''
    try {
        res = execSync('git log -n 1', {
            // cwd: workdir
        }).toString()
    } catch (e) {
        return {
            commitHash: '',
            commitDate: '',
        }
    }
    const commitHash = res.slice(7, 15)
    const startIndex = res.indexOf('Date:')
    const endIndex = res.slice(startIndex).indexOf('\n') + startIndex
    const dateStr = res.slice(startIndex, endIndex).trim()
    const commitDate = new Date(dateStr).toLocaleString()
    return {
        commitHash,
        commitDate,
    }
}

function prompt(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise(resolve => {
        rl.question(query, (str) => {
            resolve(str)
            rl.close();
        })
    })
}

function spawnExec(commandStr, params, callback) {
    const res = spawn(commandStr, params, {
        stdio: 'inherit'
    });
    res.on('close', (code) => {
        callback && callback(code)
    })
}


module.exports = {
    getGitCommit,
    prompt,
    spawnExec,
}
