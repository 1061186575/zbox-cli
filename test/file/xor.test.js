const fs = require('fs');
const os = require('os');
const path = require('path');

const { xor } = require('../../src/file/xor');

function createTestDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'zbox-xor-test-'));
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

describe('xor', () => {
    let testDir;

    beforeEach(() => {
        testDir = createTestDir();
    });

    afterEach(() => {
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    test('processes a file in place and repeated processing restores it', async () => {
        const filePath = path.join(testDir, 'sample.bin');
        const original = Buffer.from([0, 1, 2, 3, 254, 255]);
        writeFile(filePath, original);

        await xor(filePath, 'secret');
        expect(fs.readFileSync(filePath)).not.toEqual(original);

        await xor(filePath, 'secret');
        expect(fs.readFileSync(filePath)).toEqual(original);
    });

    test('processes all files recursively into an output directory', async () => {
        const sourceDir = path.join(testDir, 'source');
        const outputDir = path.join(testDir, 'output');
        const firstFile = path.join(sourceDir, 'first.txt');
        const secondFile = path.join(sourceDir, 'nested', 'second.txt');
        writeFile(firstFile, 'first');
        writeFile(secondFile, 'second');

        const outputFiles = await xor(sourceDir, 'key', { output: outputDir });

        expect(outputFiles).toHaveLength(2);
        expect(fs.readFileSync(path.join(outputDir, 'first.txt'), 'utf8')).not.toBe('first');
        expect(fs.readFileSync(path.join(outputDir, 'nested', 'second.txt'), 'utf8')).not.toBe('second');
        expect(fs.readFileSync(firstFile, 'utf8')).toBe('first');
        expect(fs.readFileSync(secondFile, 'utf8')).toBe('second');
    });

    test('does not process nested files when recursive is disabled', async () => {
        const sourceDir = path.join(testDir, 'source');
        const outputDir = path.join(testDir, 'output');
        const firstFile = path.join(sourceDir, 'first.txt');
        const secondFile = path.join(sourceDir, 'nested', 'second.txt');
        writeFile(firstFile, 'first');
        writeFile(secondFile, 'second');

        await xor(sourceDir, 'key', { output: outputDir, recursive: false });

        expect(fs.existsSync(path.join(outputDir, 'first.txt'))).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'nested', 'second.txt'))).toBe(false);
    });

    test('rejects overwriting a separate existing output file unless requested', async () => {
        const inputPath = path.join(testDir, 'input.txt');
        const outputPath = path.join(testDir, 'output.txt');
        writeFile(inputPath, 'input');
        writeFile(outputPath, 'output');

        await expect(xor(inputPath, 'key', { output: outputPath })).rejects.toThrow('输出文件已存在');
        await xor(inputPath, 'key', { output: outputPath, overwrite: true });
        expect(fs.readFileSync(outputPath, 'utf8')).not.toBe('output');
    });

    // test('rejects an empty key', async () => {
    //     const filePath = path.join(testDir, 'sample.txt');
    //     writeFile(filePath, 'sample');
    //
    //     await expect(xor(filePath, '')).rejects.toThrow('异或密钥不能为空');
    // });
});
