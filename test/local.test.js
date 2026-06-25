const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const cliPath = path.join(__dirname, '../bin/zbox.js');

function createTempHome() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'zbox-local-test-'));
}

function runLocal(args, homeDir) {
    return execFileSync(process.execPath, [cliPath, ...args], {
        cwd: path.join(__dirname, '..'),
        env: {
            ...process.env,
            HOME: homeDir
        },
        encoding: 'utf8'
    });
}

function writeLocalCommand(homeDir) {
    const commandPath = path.join(homeDir, 'hello.js');
    fs.writeFileSync(commandPath, `
function main(options) {
    console.log(JSON.stringify(options));
}

module.exports = {
    main,
    cmdName: 'hello',
    description: '测试本地命令',
    options: [
        {
            name: 'name',
            desc: '可选名称'
        },
        {
            name: 'token',
            desc: '必填 token',
            required: true
        },
        {
            name: 'no-cache',
            desc: '禁用缓存'
        }
    ]
};
`, 'utf8');
    return commandPath;
}

describe('Local Command', () => {
    let homeDir;

    beforeEach(() => {
        homeDir = createTempHome();
    });

    afterEach(() => {
        fs.rmSync(homeDir, {
            recursive: true,
            force: true
        });
    });

    test('should list local command name and description', () => {
        const commandPath = writeLocalCommand(homeDir);
        runLocal(['local', 'add', commandPath], homeDir);

        const output = runLocal(['local', 'list'], homeDir);

        expect(output).toContain(`[文件] ${commandPath}`);
        expect(output).toContain('hello - 测试本地命令');
    });

    test('should support optional, required, and no-name options', () => {
        const commandPath = writeLocalCommand(homeDir);
        runLocal(['local', 'add', commandPath], homeDir);

        const optionalFlagOutput = runLocal(['local', 'hello', '--name'], homeDir);
        expect(JSON.parse(optionalFlagOutput.trim())).toEqual({
            cache: true,
            name: true
        });

        const optionalValueOutput = runLocal(['local', 'hello', '--name', 'zp'], homeDir);
        expect(JSON.parse(optionalValueOutput.trim())).toEqual({
            cache: true,
            name: 'zp'
        });

        const noFlagOutput = runLocal(['local', 'hello'], homeDir);
        expect(JSON.parse(noFlagOutput.trim())).toEqual({
            cache: true
        });

        const noNameOutput = runLocal(['local', 'hello', '--no-cache'], homeDir);
        expect(JSON.parse(noNameOutput.trim())).toEqual({
            cache: false
        });

        const requiredValueOutput = runLocal(['local', 'hello', '--token', 'abc'], homeDir);
        expect(JSON.parse(requiredValueOutput.trim())).toEqual({
            token: 'abc',
            cache: true
        });
    });

    test('should require a value when option required is true', () => {
        const commandPath = writeLocalCommand(homeDir);
        runLocal(['local', 'add', commandPath], homeDir);

        const result = spawnSync(process.execPath, [cliPath, 'local', 'hello', '--token'], {
            cwd: path.join(__dirname, '..'),
            env: {
                ...process.env,
                HOME: homeDir
            },
            encoding: 'utf8'
        });

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("error: option '--token <token>' argument missing");
    });
});
