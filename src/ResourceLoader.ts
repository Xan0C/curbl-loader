import {Middleware} from "./Middleware";
import {Resource} from "./Resource";
import {AsyncWorkerQueue} from "./AsyncWorkerQueue";
import {EmitSignal} from "./EmitSignal";
import * as EventEmitter from "eventemitter3";

export type ResourceConfig = {
    resources: {
        resource: Resource<any>,
        args?: any[]
    }[],
};

export type LoadConfig = ResourceConfig & {
    onResourcesLoaded?: (...resources:Resource<any>[]) => void;
    onResourcesLoadedContext?: any;
};

export enum LOADER_EVENTS {
    PRE = "PRE",
    AFTER = "AFTER",
    PROGRESS = "PROGRESS",
    LOAD_START = "LOAD_START",
    LOAD_COMPLETE = "LOAD_COMPLETE",
    ERROR = "ERROR",
}

export class ResourceLoader {

    private resourceQueue: AsyncWorkerQueue;
    private middleware:{[id:string]:Middleware<any>};

    private readonly _emitter: EventEmitter;

    /**
     * Called for each Resource before starting to load the resource
     */
    private readonly _preSignal: EmitSignal<(resource:Resource<any>)=>void>;

    /**
     * Called for each Resource after finished loading the resource and transforming it through the middleware
     */
    private readonly _afterSignal:EmitSignal<(...data)=>void>;

    /**
     * Progress event for each resource
     */
    readonly onProgress:EmitSignal<(event:ProgressEvent)=>void>;
    /**
     * Called once for each Resource when it starts loading
     */
    readonly onLoadStart:EmitSignal<(resource:Resource<any>)=>void>;
    /**
     * Called for each Resource if an error happens during loading the resource
     */
    readonly onError:EmitSignal<(event:Event)=>void>;
    /**
     * Called once after load if all the resources and Middlewares have finished loading all resources
     */
    readonly onComplete:EmitSignal< () => void>;

    constructor(concurrency:number=10) {
        this._emitter = new EventEmitter();
        this.middleware = Object.create(null);
        this.resourceQueue = new AsyncWorkerQueue(concurrency);
        this._preSignal = new EmitSignal(this._emitter, LOADER_EVENTS.PRE);
        this._afterSignal = new EmitSignal(this._emitter, LOADER_EVENTS.AFTER);
        this.onProgress = new EmitSignal(this._emitter,LOADER_EVENTS.PROGRESS);
        this.onLoadStart = new EmitSignal(this._emitter,LOADER_EVENTS.LOAD_START);
        this.onError = new EmitSignal(this._emitter,LOADER_EVENTS.ERROR);
        this.onComplete = new EmitSignal(this._emitter,LOADER_EVENTS.LOAD_COMPLETE);
    }

    private _callAfter(data) {
        this._afterSignal.emit(data);
    }

    /**
     * Add a new LoadMiddleware e.g. to load Models from OBJ,GLTF file or to load Textures, Audio etc
     * @param {Middleware} middleware
     * @param {string | {new(...args): T}} id
     * @returns {T}
     */
    public addMiddleware<T extends Middleware<any>>(middleware:T,id:string|{new(...args):T}):T{
        Middleware.inject(middleware);
        middleware._loader = this;
        if(id && typeof id === "string"){
            this.middleware[id] = middleware;
        }else if(id && typeof id !== "string"){
            this.middleware[id.prototype.constructor.name] = middleware;
        }
        middleware.onLoad.on(this._callAfter,this);
        return middleware;
    }

    /**
     * Remove a LoadMiddleware from the ResourceLoader
     * @param {string | {new(...args): T}} id
     */
    public removeMiddleware<T extends Middleware<any>>(id:string|{new(...args):T}){
        if(id && typeof id === "string"){
            delete this.middleware[id];
        }else if(id && typeof id !== "string"){
            delete this.middleware[id.prototype.constructor.name];
        }
    }

    /**
     * get a LoadComponent
     * @param {string | {new(...args): T}} id
     * @returns {T}
     */
    public get<T extends Middleware<any>>(id:string|{new(...args):T}):T{
        if(id && typeof id === "string") {
            return this.middleware[id] as T;
        }else if(id && typeof id !== "string"){
            return this.middleware[id.prototype.constructor.name] as T;
        }
        return undefined;
    }

    addResourceToQueue(config: LoadConfig):ResourceLoader {
        config.resources.forEach(value => {
            value.resource.onProgress.on((event) => this.onProgress.emit(event));
            value.resource.onError.on((event) => this.onError.emit(event));
            value.resource.onLoadStart.on(() => {
                this._preSignal.emit(value.resource);
                this.onLoadStart.emit(value.resource);
            })
        });

        this.resourceQueue.enqueue({
            tasks: config.resources.map(value => {
                return {
                    resource: value.resource,
                    process: value.resource.load,
                    processContext: value.resource,
                    listener: value.resource.onLoadFinished.once,
                    listenerContext: value.resource.onLoadFinished,
                    args: value.args
                };
            }),
            onWorkFinished: config.onResourcesLoaded,
            onWorkFinishedContext: config.onResourcesLoadedContext
        });
        return this;
    }

    pre<T>(cb: (resource: Resource<T>) => void):ResourceLoader {
        this._preSignal.on(cb);
        return this;
    }

    after(cb: (...data) => void):ResourceLoader {
        this._afterSignal.on(cb);
        return this;
    }

    _onLoadComplete() {
        this._preSignal.removeAllListeners();
        this._afterSignal.removeAllListeners();
        this.onComplete.emit();
    }

    load(finishCb?:()=>void):ResourceLoader {
        if(finishCb && typeof finishCb === 'function') {
            this.onComplete.once(finishCb);
        }
        this.resourceQueue.process(()=>this._onLoadComplete());
        return this;
    }
}