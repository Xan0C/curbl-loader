import {LOAD_TYPE, Middleware, Resource, ResourceLoader} from "../../lib";

export class ImageLoader extends Middleware<{width:number,height:number}> {
    _loader: ResourceLoader;

    add(key: string, url: string, width?:number, height?: number): Middleware<{width:number,height:number}> {
        this.addResourceToQueue({
            resources: [{
                resource: new Resource<HTMLImageElement>(),
                args: [{
                    url: url,
                    loadType: LOAD_TYPE.IMAGE,
                    width: width,
                    height: height
                }]
            }]
        });
        return this;
    }

    transform(resource: Resource<HTMLImageElement>): {width:number,height:number} {
        return resource.data;
    }
}
