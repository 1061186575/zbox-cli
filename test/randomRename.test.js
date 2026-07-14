const fs = require('fs')
const os = require('os')
const path = require('path')
const randomRename = require('../src/file/randomRename')

function createTestDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'randomRename-test-'))
}

function readRecordFile(recordPath) {
    const content = fs.readFileSync(recordPath, 'utf8')
    return JSON.parse(Buffer.from(content.split(','), 'utf8').toString())
}

describe('randomRename', () => {
    let testDir

    beforeEach(() => {
        testDir = createTestDir()
        jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
        fs.rmSync(testDir, { recursive: true, force: true })
    })

    test('writes the record file before renaming files', async () => {
        const recordFileName = '.__RECORDFILENAME'
        const recordPath = path.join(testDir, recordFileName)
        const fileA = path.join(testDir, 'a.txt')
        const fileB = path.join(testDir, 'b.txt')

        fs.writeFileSync(fileA, 'A')
        fs.writeFileSync(fileB, 'B')

        const originalRenameSync = fs.renameSync
        jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
            if (from.startsWith(`${recordPath}.tmp-`)) {
                return originalRenameSync.call(fs, from, to)
            }
            throw new Error('simulated rename failure')
        })

        await randomRename(testDir, '1')

        expect(fs.existsSync(recordPath)).toBe(true)
        expect(fs.existsSync(fileA)).toBe(true)
        expect(fs.existsSync(fileB)).toBe(true)

        const record = readRecordFile(recordPath)
        expect(record['/a.txt']).toEqual(expect.any(String))
        expect(record['/b.txt']).toEqual(expect.any(String))

        jest.restoreAllMocks()
        jest.spyOn(console, 'log').mockImplementation(() => {})

        await randomRename(testDir, '2')

        expect(fs.existsSync(recordPath)).toBe(false)
        expect(fs.readFileSync(fileA, 'utf8')).toBe('A')
        expect(fs.readFileSync(fileB, 'utf8')).toBe('B')
    })

    test('waits for base64 rename and restore operations to finish', async () => {
        const recordPath = path.join(testDir, '.__RECORDFILENAME')
        const nestedDir = path.join(testDir, 'nested')
        const originalFile = path.join(nestedDir, 'file.txt')
        const content = 'hello base64\n'.repeat(100)

        fs.mkdirSync(nestedDir)
        fs.writeFileSync(originalFile, content)

        await randomRename(testDir, '1', undefined, true, true)

        expect(fs.existsSync(recordPath)).toBe(true)
        expect(fs.existsSync(originalFile)).toBe(false)

        const record = readRecordFile(recordPath)
        const renamedPath = path.join(testDir, record['/nested/file.txt'])
        expect(fs.existsSync(renamedPath)).toBe(true)
        expect(fs.readFileSync(renamedPath, 'utf8')).toBe(Buffer.from(content).toString('base64'))

        await randomRename(testDir, '2')

        expect(fs.existsSync(recordPath)).toBe(false)
        expect(fs.readFileSync(originalFile, 'utf8')).toBe(content)
        expect(fs.existsSync(renamedPath)).toBe(false)
    })
})
