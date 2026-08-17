const fs = require('fs')
const os = require('os')
const path = require('path')

jest.mock('../../src/utils', () => ({
    question: jest.fn(),
}))

const { question } = require('../../src/utils')
const classify = require('../../src/file/classify')

function createTestDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'classify-test-'))
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content)
}

describe('classify', () => {
    let testDir
    let sourceDir
    let outputDir

    beforeEach(() => {
        testDir = createTestDir()
        sourceDir = path.join(testDir, 'source')
        outputDir = path.join(testDir, 'output')
        fs.mkdirSync(sourceDir)
        question.mockResolvedValue('y')
        jest.spyOn(console, 'log').mockImplementation(() => {})
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
        question.mockReset()
        fs.rmSync(testDir, { recursive: true, force: true })
    })

    test('copies files into sorted batches without changing source files', async () => {
        writeFile(path.join(sourceDir, 'c.txt'), 'C')
        writeFile(path.join(sourceDir, 'a.txt'), 'A')
        writeFile(path.join(sourceDir, 'b.txt'), 'B')

        await classify({
            dir: sourceDir,
            output: outputDir,
            sort: 'name',
            copy: true,
            SUB_DIR_NAME: 'batch',
            MAX_FILE_COUNT: '2',
            MAX_TOTAL_SIZE_GB: '4',
        })

        expect(fs.readFileSync(path.join(outputDir, 'batch1', 'a.txt'), 'utf8')).toBe('A')
        expect(fs.readFileSync(path.join(outputDir, 'batch1', 'b.txt'), 'utf8')).toBe('B')
        expect(fs.readFileSync(path.join(outputDir, 'batch2', 'c.txt'), 'utf8')).toBe('C')

        expect(fs.existsSync(path.join(sourceDir, 'a.txt'))).toBe(true)
        expect(fs.existsSync(path.join(sourceDir, 'b.txt'))).toBe(true)
        expect(fs.existsSync(path.join(sourceDir, 'c.txt'))).toBe(true)
    })

    test('moves files by default and avoids overwriting duplicate names', async () => {
        const firstFile = path.join(sourceDir, 'one', 'same.txt')
        const secondFile = path.join(sourceDir, 'two', 'same.txt')
        writeFile(firstFile, 'one')
        writeFile(secondFile, 'two')

        await classify({
            dir: sourceDir,
            output: outputDir,
            sort: 'name',
            copy: false,
            SUB_DIR_NAME: 'dir',
            MAX_FILE_COUNT: '10',
            MAX_TOTAL_SIZE_GB: '4',
        })

        const movedFiles = fs.readdirSync(path.join(outputDir, 'dir1')).sort()
        expect(movedFiles).toEqual(['same.txt', 'same_1.txt'])

        const movedContents = movedFiles
            .map(fileName => fs.readFileSync(path.join(outputDir, 'dir1', fileName), 'utf8'))
            .sort()
        expect(movedContents).toEqual(['one', 'two'])
        expect(fs.existsSync(firstFile)).toBe(false)
        expect(fs.existsSync(secondFile)).toBe(false)
    })

    test('does not process files when confirmation is rejected', async () => {
        question.mockResolvedValue('n')
        const sourceFile = path.join(sourceDir, 'a.txt')
        writeFile(sourceFile, 'A')

        await classify({
            dir: sourceDir,
            output: outputDir,
            sort: 'name',
            copy: true,
            SUB_DIR_NAME: 'dir',
            MAX_FILE_COUNT: '1',
            MAX_TOTAL_SIZE_GB: '4',
        })

        expect(fs.existsSync(sourceFile)).toBe(true)
        expect(fs.existsSync(outputDir)).toBe(false)
    })
})
