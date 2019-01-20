export type Task<T> = {
    worker?: Worker;
    resource?: T;
    process: (...args) => void;
    listener: (cb: () => void) => void;
    args?: any[];
    completed?: boolean;
}

export type Worker = {
    tasks: Task<any>[];
    count?:number;
    onWorkFinished?: (...resource) => void;
    onTaskComplete?: (resource) => void;
}

function _noop() {}

export class AsyncWorkerQueue {
    private finishCb: () => void;
    private concurrency: number;
    private processes: number;
    private paused: boolean;
    private workers:Worker[];
    private tasks: Task<any>[];

    constructor(concurrency:number) {
        this.concurrency = concurrency;
        this.paused = false;
        this.workers = [];
        this.tasks = [];
    }

    once<T>(object,fnName:string): () => void {
        return (...args) => {
            const cbFn = object[fnName] || _noop;
            object[fnName] = _noop;
            cbFn(...args);
        }
    }

    process(finishCb?: () => void) {
        this.finishCb = finishCb || _noop;
        while(this.paused && this.processes < this.concurrency && this.tasks.length) {
            const task = this.tasks.shift();
            this.processes++;

            task.listener(() => this.next(task));
            task.process(...task.args);
        }
    }

    enqueue(worker:Worker) {
        if(!worker.tasks || worker.tasks.length === 0) {
            throw "Worker needs to have at least one task";
        }

        this.workers.push({
            tasks: worker.tasks,
            count:0,
            onWorkFinished: this.once(worker,'onWorkFinished'),
            onTaskComplete: worker.onTaskComplete || _noop
        });

        for(let i=0, task:Task<any>; task = worker.tasks[i]; i++) {
            this.tasks.push({
                ...task,
                worker: worker,
                completed: false
            });
        }
    }

    dequeue(...workers:Worker[]) {
        for(let i=0, worker:Worker; worker = workers[i]; i++) {
            const index = this.workers.indexOf(worker);
            if (index != -1) {
                for(let k=0, task:Task<any>; task = worker.tasks[k]; k++) {
                    const taskIndex = this.tasks.indexOf(task);
                    if(taskIndex != -1) {
                        this.tasks.splice(taskIndex,1);
                    }
                }
                this.workers.splice(index, 1);
            }
        }
    }

    idle():boolean {
        return this.length + this.processes + this.workers.length === 0;
    }

    next<T>(task:Task<T>) {
        //Completed the task
        this.processes--;
        task.completed = true;
        //Check if all tasks of the Worker have been completed
        this.workerFinished(task.worker);
    }

    /**
     * If all tasks of the worker have been completed we can call its onWorkFinished callback
     * and remove the worker from the queue
     * @param worker
     */
    private workerFinished(worker:Worker) {
        worker.count++;
        const index = this.workers.indexOf(worker);
        if(worker.count === worker.tasks.length && index != -1) {
            const resources = worker.tasks.map((task)=>task.resource);
            worker.onWorkFinished(...resources);
            this.workers.splice(index,1);
        }
        if(this.idle()) {
            this.finishCb();
        }
    }

    pause():void {
        this.paused = true;
    }

    resume():void {
        if(this.paused === false) {
            return;
        }

        this.paused = false;
        this.process();
    }

    get length(): number {
        return this.tasks.length;
    }

    get running(): boolean {
        return !!this.processes;
    }
}