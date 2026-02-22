const { spawnExec } = require("../utils");


function main(options) {
    const { global, register } = options;
    const params = [
        'install',
        'zbox-cli',
    ]
    if (global === true || global === 'true') {
        params.push('--global')
    }
    if (register) {
        params.push(`--register=${register}`)
    }

    console.log(`npm ${params.join(' ')}`);
    spawnExec('npm', params)
}

module.exports = main;
