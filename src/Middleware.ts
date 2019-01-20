import {ResourceLoader} from "./ResourceLoader";
import {Resource} from "./Resource";
import * as EventEmitter from "eventemitter3";
import {EmitSignal} from "./EmitSignal";

export interface Middleware<T> {
    _loader?: ResourceLoader;
    readonly onLoad?:EmitSignal<(...data:T[])=>void>;
    add(key:string, ...args:any):Middleware<T>;
    transform?(...resources:Resource<any>[]):T|T[];
}

export enum MIDDLEWARE_EVENTS {
    LOAD_COMPLETE = "LOAD_COMPLETE"
}

const MIDDLEWARE_PROPERTIES = {
    _emitter: () => new EventEmitter(),
    onLoad: () => new EmitSignal(this._emitter,MIDDLEWARE_EVENTS.LOAD_COMPLETE),
};

const MIDDLEWARE_PROTOTYPE = {
    transform: () => Middleware.prototype.transform,
    add: () => Middleware.prototype.add,
    queueCallback: () => Middleware.prototype.queueCallback
};

export class Middleware<T> implements Middleware<T> {

    private readonly _emitter:EventEmitter = new EventEmitter();
    readonly onLoad?:EmitSignal<(...data:T[])=>void> = new EmitSignal(this._emitter,MIDDLEWARE_EVENTS.LOAD_COMPLETE);
    _loader?: ResourceLoader;

    constructor() {
        this._emitter = new EventEmitter();
    }

    static inject<T>(middleware:Middleware<T>) {
        for(let propKey in MIDDLEWARE_PROPERTIES){
            if(middleware[propKey] === undefined || middleware[propKey] === null){
                middleware[propKey] = MIDDLEWARE_PROPERTIES[propKey]();
            }
        }
        for(let protoKey in MIDDLEWARE_PROTOTYPE){
            if(middleware.constructor && middleware.constructor.prototype){
                if(middleware.constructor.prototype[protoKey] === undefined || middleware.constructor.prototype[protoKey] === null){
                    middleware.constructor.prototype[protoKey] = MIDDLEWARE_PROTOTYPE[protoKey]();
                }
            }else{
                if(middleware[protoKey] === undefined || middleware[protoKey] === null){
                    middleware[protoKey] = MIDDLEWARE_PROTOTYPE[protoKey]();
                }
            }
        }
    }

    add(key: string, ...args): Middleware<T> {
        this._loader.addResourceToQueue({
            resources: [{
                resource: new Resource<any>(),
                args: [...args]
            }],
            onAllResourcesLoaded: this.queueCallback
        });
        return this;
    }

    queueCallback?(...resources:Resource<any>[]) {
        const data = this.transform(...resources);

        if(Array.isArray(data)) {
            this.onLoad.emit(...data);
        }else {
            this.onLoad.emit(data);
        }
    }

    /**
     * transform is called after the Middleware has finished processing the Resources
     * that have been added to the LoadQueue of the loader
     * its used to further transform the loaded data, e.g. if u have 2 files json and binary etc.
     * @param resources {Resource[]} - the resources that have finished loading
     */
    transform?(...resources:Resource<any>[]):T|T[] {
        return resources.map(resource => resource.data);
    }
}