import {ResourceConfig, ResourceLoader} from "./ResourceLoader";
import {Resource} from "./Resource";
import * as EventEmitter from "eventemitter3";
import {EmitSignal} from "./EmitSignal";

export type MiddlewareData<T> = {
    key?: string;
    type?: number|string;
    data?: T | T[]
};

export interface Middleware<T> {
    type?: string|number;
    _loader?: ResourceLoader;
    onLoad?:EmitSignal<(data:MiddlewareData<T>)=>void>;
    add(...args:any[]):Middleware<T>;
    transform?(...resources:Resource<any>[]):T|T[];
}

export enum RESOURCE_LOADER_EVENTS {
    LOAD_COMPLETE = "LOAD_COMPLETE"
}

const RESOURCE_LOADER_PROPERTIES = {
    _emitter: () => new EventEmitter(),
    onLoad: () => new EmitSignal(this._emitter,RESOURCE_LOADER_EVENTS.LOAD_COMPLETE),
};

const RESOURCE_LOADER_PROTOTYPE = {
    transform: () => Middleware.prototype.transform,
    add: () => Middleware.prototype.add,
    addResourceToQueue: () => Middleware.prototype.addResourceToQueue,
    _queueCallback: () => Middleware.prototype._queueCallback
};

export class Middleware<T> implements Middleware<T> {

    private readonly _emitter:EventEmitter;
    onLoad?:EmitSignal<(data:MiddlewareData<T>)=>void>;
    _loader?: ResourceLoader;
    type?: string|number;

    constructor(type?:string|number) {
        this._emitter = new EventEmitter();
        this.onLoad = new EmitSignal(this._emitter,RESOURCE_LOADER_EVENTS.LOAD_COMPLETE);
        this.type = type;
    }

    static inject<T>(middleware:Middleware<T>) {
        for(let propKey in RESOURCE_LOADER_PROPERTIES){
            if(middleware[propKey] === undefined || middleware[propKey] === null){
                middleware[propKey] = RESOURCE_LOADER_PROPERTIES[propKey]();
            }
        }
        for(let protoKey in RESOURCE_LOADER_PROTOTYPE){
            if(middleware.constructor && middleware.constructor.prototype){
                if(middleware.constructor.prototype[protoKey] === undefined || middleware.constructor.prototype[protoKey] === null){
                    middleware.constructor.prototype[protoKey] = RESOURCE_LOADER_PROTOTYPE[protoKey]();
                }
            }else{
                if(middleware[protoKey] === undefined || middleware[protoKey] === null){
                    middleware[protoKey] = RESOURCE_LOADER_PROTOTYPE[protoKey]();
                }
            }
        }
    }

    add(url:string,...args): Middleware<T> {
        this.addResourceToQueue({
            resources: [{
                resource: new Resource<any>(url),
                args: [...args]
            }]
        });
        return this;
    }

    addResourceToQueue(config: ResourceConfig): Middleware<T> {
        this._loader._addResourceToQueue({
            resources: config.resources,
            onResourcesLoaded: (...resources)=>this._queueCallback(config.key,this.type,...resources),
            onResourcesLoadedContext: this
        });
        return this;
    }

    _queueCallback(key:string, type:string|number, ...resources:Resource<any>[]) {
        const data = this.transform(...resources);
        this.onLoad.emit({key: key, type:type, data: data});
    }

    /**
     * transform is called after the Middleware has finished processing the Resources
     * that have been added to the LoadQueue of the loader
     * its used to further transform the loaded data, e.g. if u have 2 files json and binary etc.
     * @param resources {Resource[]} - the resources that have finished loading
     */
    transform?(...resources:Resource<any>[]):T|T[] {
        return resources.map(resource => resource.request);
    }
}