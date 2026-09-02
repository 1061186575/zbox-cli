const { TaskController } = require('../../src/utils/taskController');

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
