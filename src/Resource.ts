import * as EventEmitter from "eventemitter3";
import {EmitSignal} from "./EmitSignal";

export type XhrResponseType = 'text'|'arraybuffer'|'blob'|'document'|'json'|'';

export type ImageOptions = {
    url: string;
    width?: number;
    height?: number;
};

export type XhrOptions = {
    url: string;
    timeout?: number;
    async?: boolean;
    responseType?: XhrResponseType;
};

export type RequestObject = HTMLImageElement|HTMLAudioElement|XMLHttpRequest;

export type ResourceOptions = {
    loadType?: LOAD_TYPE;
    responseType?: XhrResponseType;
} & ImageOptions & XhrOptions;

export type RequestType = HTMLImageElement | XMLHttpRequest;

export interface Resource<T extends RequestType = XMLHttpRequest> {
    request?:T;
    loadXhr?(options:XhrOptions, ...args):XMLHttpRequest;
    loadImage?(options:ImageOptions, ...args):HTMLImageElement;
    load?(options: ResourceOptions|string, ...args):Resource<T>;
    onProgress?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;
    onLoadStart?:EmitSignal<(event:Event, request:RequestObject, ...args)=>void>;
    onLoadFinished?:EmitSignal<(resource:Resource<T>)=>void>;
    onError?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    onAbort?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    onTimeout?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;
}

export enum RESOURCE_EVENT {
    PROGRESS = "resource_event_progress",
    LOAD_START = "resource_event_loadStart",
    LOAD_COMPLETE = "resource_event_load",
    ERROR = "resource_event_error",
    ABORT = "resource_event_abort",
    TIMEOUT = "resource_event_timeout"
}

export enum LOAD_TYPE {
    XHR = 'xhr',
    IMAGE = 'image'
}

export class Resource<T extends RequestType> implements Resource<T> {

    private _emitter:EventEmitter;

    onProgress?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;
    onLoadStart?:EmitSignal<(event:Event, request:RequestObject, ...args)=>void>;
    onLoadFinished?:EmitSignal<(resource:Resource<T>)=>void>;
    onError?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    onAbort?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    onTimeout?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;

    public request?: T;
    public config?: {[key:string]:any};

    constructor(config?:{[key:string]:any}) {
        this.config = config;
        this._emitter = new EventEmitter();
        this.onProgress = new EmitSignal(this._emitter,RESOURCE_EVENT.PROGRESS);
        this.onLoadStart = new EmitSignal(this._emitter,RESOURCE_EVENT.LOAD_START);
        this.onLoadFinished = new EmitSignal(this._emitter,RESOURCE_EVENT.LOAD_COMPLETE);
        this.onError = new EmitSignal(this._emitter,RESOURCE_EVENT.ERROR);
        this.onAbort = new EmitSignal(this._emitter,RESOURCE_EVENT.ABORT);
        this.onTimeout = new EmitSignal(this._emitter,RESOURCE_EVENT.TIMEOUT);
    }

    /**
     * Create a XMLHttpRequest and start loading the Resource
     * @param options - { url: string, timeout?: number, asnyc?: boolean, responseType?: string;}
     * @param args - will be emitted with loadstart and load events
     */
    loadXhr?(options:XhrOptions, ...args):XMLHttpRequest {
        const request = new XMLHttpRequest();
        request.timeout = options.timeout;
        request.responseType = options.responseType || 'text';
        request.open('GET', options.url, options.async === undefined ? true : !!options.async);
        request.addEventListener('progress', (event:ProgressEvent) => this.onProgress.emit(event, request), {once: true});
        request.addEventListener('loadstart', (event:Event) => this.onLoadStart.emit(event, request, ...args), {once: true});
        request.addEventListener('load', (event:Event) => this.onLoadFinished.emit(this), {once: true});
        request.addEventListener('error', (event:ErrorEvent) => this.onError.emit(event, request), {once: true});
        request.addEventListener('abort', (event:Event) => this.onAbort.emit(event, request), {once: true});
        request.addEventListener('timeout', (event:ProgressEvent) => this.onTimeout.emit(event, request), {once: true});
        request.send();
        return request;
    }

    /**
     * Create a HTMLImageElement and start loading the Resource
     * @param options - { url: string, width?: number, height?: number }
     * @param args - will be emitted with loadstart and load events
     */
    loadImage?(options:ImageOptions, ...args):HTMLImageElement {
        const image = new Image(options.width, options.height);
        if(!image){
            console.error('Failed to create Image Object');
            this.onError.emit(event, image);
            return image;
        }
        image.addEventListener('progress', (event:ProgressEvent) => this.onProgress.emit(event, image), {once: true});
        image.addEventListener('loadstart', (event:Event) => this.onLoadStart.emit(event, image, ...args), {once: true});
        image.addEventListener('load', (event:Event) => this.onLoadFinished.emit(this), {once: true});
        image.addEventListener('error', (event:ErrorEvent) => this.onError.emit(event, image), {once: true});
        image.addEventListener('abort', (event:Event) => this.onAbort.emit(event, image), {once: true});
        image.src = options.url;
        return image;
    }

    /**
     * Called by the _loader to start loading the Resource
     * @param options - load options for the resource or the url
     * @param args
     * @returns {LoadComponent}
     */
    load?(options: ResourceOptions|string, ...args):Resource<T> {
        let loadOptions = options;

        if(typeof options === 'string') {
            loadOptions = {
                url: options,
                loadType: LOAD_TYPE.XHR,
                responseType: ''
            };
        } else {
            loadOptions = {
                ...options,
                url: options.url,
                loadType: options.loadType || LOAD_TYPE.XHR,
                responseType: options.responseType || ''
            };
        }

        switch (loadOptions.loadType) {
            case LOAD_TYPE.IMAGE:
                this.request = this.loadImage(loadOptions,...args) as T;
                return this;
            case LOAD_TYPE.XHR:
                this.request = this.loadXhr(loadOptions, ...args) as T;
                return this;
        }
        return this;
    }
}