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
    options: ResourceOptions;
    config: {[key:string]:any};
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
    private static tempAnchor: HTMLAnchorElement;

    onProgress?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;
    onLoadStart?:EmitSignal<(event:Event, request:RequestObject, ...args)=>void>;
    onLoadFinished?:EmitSignal<(resource:Resource<T>)=>void>;
    onError?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    onAbort?:EmitSignal<(event:Event, request:RequestObject)=>void>;
    onTimeout?:EmitSignal<(event:ProgressEvent, request:RequestObject)=>void>;

    public request?: T;
    public options: ResourceOptions;
    public config: {[key:string]:any};

    constructor(options:ResourceOptions|string,config?:{[key:string]:any}) {
        this.config = config || Object.create(null);
        if(typeof options === 'string') {
            this.options = {
                url: options,
                loadType: LOAD_TYPE.XHR,
                responseType: ''
            };
        } else {
            this.options = {
                ...options,
                url: options.url,
                loadType: options.loadType || LOAD_TYPE.XHR,
                responseType: options.responseType || ''
            };
        }

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
        image.crossOrigin = this._determineCrossOrigin(options.url);
        image.src = options.url;
        return image;
    }

    private _determineCrossOrigin(url:string) {
        // data: and javascript: urls are considered same-origin
        if (url.indexOf('data:') === 0) {
            return '';
        }

        // A sandboxed iframe without the 'allow-same-origin' attribute will have a special
        // origin designed not to match window.location.origin, and will always require
        // crossOrigin requests regardless of whether the location matches.
        if (window.origin !== window.location.origin) {
            return 'anonymous';
        }

        // default is window.location
        const loc = window.location;

        if (!Resource.tempAnchor) {
            Resource.tempAnchor = document.createElement('a');
        }

        // let the browser determine the full href for the url of this resource and then
        // use the properties of the anchor element, cause fuck IE9
        Resource.tempAnchor.href = url;

        const samePort = (!Resource.tempAnchor.port && loc.port === '') || (Resource.tempAnchor.port === loc.port);
        const protocol = Resource.tempAnchor.protocol ? `${Resource.tempAnchor.protocol}:` : '';

        // if cross origin
        if (Resource.tempAnchor.host !== loc.hostname || !samePort || protocol !== loc.protocol) {
            return 'anonymous';
        }

        return '';
    }

    /**
     * Called by the _loader to start loading the Resource
     * @param options - load options for the resource or the url
     * @param args
     * @returns {LoadComponent}
     */
    load?(...args):Resource<T> {
        switch (this.options.loadType) {
            case LOAD_TYPE.IMAGE:
                this.request = this.loadImage(this.options,...args) as T;
                return this;
            case LOAD_TYPE.XHR:
                this.request = this.loadXhr(this.options, ...args) as T;
                return this;
        }
        return this;
    }
}