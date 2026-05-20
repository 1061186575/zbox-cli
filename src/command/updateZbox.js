const { spawnExec } = require("../utils");


function main(options) {
    const { global, register } = options;
    const params = [
        'install',
        'zbox-cli@latest',
    ]
    if (global === true || global === 'true') {
        params.push('--global')
    }
    if (register) {
        params.push(`--registry=${register}`)
    }

    console.log(`npm ${params.join(' ')}`);
    spawnExec('npm', params)
}

module.exports = main;
