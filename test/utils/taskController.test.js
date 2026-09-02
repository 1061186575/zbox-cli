const fs = require('fs');
const os = require('os');
const path = require('path');
const { TaskController } = require('../../src/utils/TaskController');
const { getAllFilePaths } = require('../../src/utils');

describe('TaskController', () => {
    test('continues queued tasks after a task fails', async () => {
        const controller = new TaskController(1);
        const failedTask = controller.addTask(async () => {
            throw new Error('failed');
        });
        const nextTask = controller.addTask(async () => 'completed');

        await expect(failedTask).rejects.toThrow('failed');
        await expect(nextTask).resolves.toBe('completed');
    });
});

describe('getAllFilePaths', () => {
    let tempPath;

    beforeEach(() => {
        tempPath = fs.mkdtempSync(path.join(os.tmpdir(), 'zbox-files-'));
        fs.writeFileSync(path.join(tempPath, 'root.jpg'), 'root');
        fs.mkdirSync(path.join(tempPath, 'child'));
        fs.writeFileSync(path.join(tempPath, 'child', 'child.mp4'), 'child');
    });

    afterEach(() => {
        fs.rmSync(tempPath, { recursive: true, force: true });
    });

    test('reads nested files recursively by default', async () => {
        const files = await getAllFilePaths(tempPath);

        expect(files).toEqual(expect.arrayContaining([
            path.join(tempPath, 'root.jpg'),
            path.join(tempPath, 'child', 'child.mp4')
        ]));
    });

    test('can disable recursive reading', async () => {
        await expect(getAllFilePaths(tempPath, false)).resolves.toEqual([
            path.join(tempPath, 'root.jpg')
        ]);
    });
});
