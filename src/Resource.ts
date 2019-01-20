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

export interface Resource<T> {
    data?:T;
    loadXhr?(options:XhrOptions, ...args):XMLHttpRequest;
    loadImage?(options:ImageOptions, ...args):HTMLImageElement;
    load?(options: ResourceOptions|string, ...args):Resource<T>;
    transform?(cb:(requestObject:RequestObject, ...args) => T):Resource<T>;
    readonly onProgress?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;
    readonly onLoadStart?:EmitSignal<(event:Event, request:RequestObject, ...args)=>void>;
    readonly onLoadFinished?:EmitSignal<(resource:Resource<T>)=>void>;
    readonly onError?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    readonly onAbort?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    readonly onTimeout?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;
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

function _noopTransform(request:RequestObject):any {
    return request;
}

export class Resource<T> implements Resource<T> {

    private transformCallback: (requestObject:RequestObject, ...args) => T = _noopTransform;
    private readonly _emitter:EventEmitter = new EventEmitter();
    readonly onProgress?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void> = new EmitSignal(this._emitter,RESOURCE_EVENT.PROGRESS);
    readonly onLoadStart?:EmitSignal<(event:Event, request:RequestObject, ...args)=>void> = new EmitSignal(this._emitter,RESOURCE_EVENT.LOAD_START);
    readonly onLoadFinished?:EmitSignal<(resource:Resource<T>)=>void> = new EmitSignal(this._emitter,RESOURCE_EVENT.LOAD_COMPLETE);
    readonly onError?:EmitSignal<(event:Event, request:RequestObject)=>void> = new EmitSignal(this._emitter,RESOURCE_EVENT.ERROR);
    readonly onAbort?:EmitSignal<(event:Event, request:RequestObject)=>void> = new EmitSignal(this._emitter,RESOURCE_EVENT.ABORT);
    readonly onTimeout?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void> = new EmitSignal(this._emitter,RESOURCE_EVENT.TIMEOUT);

    data?: T;

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
        request.addEventListener('load', (event:Event) => this.finished(event, request, ...args), {once: true});
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
        image.addEventListener('load', (event:Event) => this.finished(event, image, ...args), {once: true});
        image.addEventListener('error', (event:ErrorEvent) => this.onError.emit(event, image), {once: true});
        image.addEventListener('abort', (event:Event) => this.onAbort.emit(event, image), {once: true});
        image.src = options.url;
        return image;
    }

    private finished(event:Event, request:RequestObject, ...args) {
        this.data = this.transformCallback(request, ...args);
        this.onLoadFinished.emit(this);
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
                this.loadImage(loadOptions,...args);
                return this;
            case LOAD_TYPE.XHR:
                this.loadXhr(loadOptions, ...args);
                return this;
        }
        return this;
    }

    /**
     * Set a cb function after the resource has finished loading to modify the Resource
     * e.g parsing an Image to a GLTexture etc.
     * @param cb {Function} - (request:RequestObject, ...args) => T, where args are the optional arguments passed to the load function
     */
    transform?(cb:(request:RequestObject,...args) => T):Resource<T> {
        this.transformCallback = cb;
        return this;
    }
}