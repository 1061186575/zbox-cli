class TaskController {
    constructor(maxConcurrentTasks) {
        this.maxConcurrentTasks = maxConcurrentTasks;
        this.runningTasks = 0;
        this.taskQueue = [];
    }

    addTask(task) {
        return new Promise((resolve, reject) => {
            const taskWrapper = async () => {
                try {
                    const result = await task();
                    this.runningTasks--;
                    resolve(result);
                    this.runNextTask();
                } catch (error) {
                    reject(error);
                }
            };

            this.taskQueue.push(taskWrapper);
            this.runNextTask();
        });
    }

    async runNextTask() {
        if (this.taskQueue.length === 0 || this.runningTasks >= this.maxConcurrentTasks) {
            return;
        }

        const taskWrapper = this.taskQueue.shift();
        this.runningTasks++;
        taskWrapper();
    }
}


function test(maxConcurrentTasks = 1) {
    const controller = new TaskController(maxConcurrentTasks);

    const urls = new Array(20).fill(0).map((d, index) => index + 1);

    for (let url of urls) {
        controller.addTask(async () => {
            console.log('开始执行: ', url)
            await new Promise(resolve => setTimeout(resolve, 2000))
            console.log('完成: ', url)
        });
    }
}

// 一个个执行
// test(1)

// 最多同时执行3个
// test(3)

// 最多同时执行5个
// test(5)

module.exports = {
    TaskController
}
