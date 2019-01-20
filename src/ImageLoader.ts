import {Middleware} from "./Middleware";
import {ResourceLoader} from "./ResourceLoader";
import {LOAD_TYPE, Resource} from "./Resource";

export class ImageLoader extends Middleware<{width:number,height:number}> {
    _loader: ResourceLoader;
    add(key: string, url: string, width?:number, height?: number): Middleware<{width:number,height:number}> {
        this._loader.addResourceToQueue({
            resources: [{
                resource: new Resource<HTMLImageElement>(),
                args: [{
                    url: url,
                    loadType: LOAD_TYPE.IMAGE,
                    width: width,
                    height: height
                }]
            }],
            onAllResourcesLoaded: this.queueCallback
        });
        return this;
    }

    transform(resource: Resource<HTMLImageElement>): {width:number,height:number} {
        return {
            width: resource.data.width,
            height: resource.data.height
        };
    }
}
