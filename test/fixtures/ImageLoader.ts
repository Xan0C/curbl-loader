import {LOAD_TYPE, Middleware, Resource} from "../../lib";

export class ImageLoader extends Middleware<{width:number,height:number}> {

    add(url: string): Middleware<{width:number,height:number}> {
        this.addResourceToQueue({
            key: url,
            resources: [{
                resource: new Resource<HTMLImageElement>({
                    url: url,
                    loadType: LOAD_TYPE.IMAGE
                })
            }]
        });
        return this;
    }

    transform(resource: Resource<HTMLImageElement>): {width:number,height:number} {
        return resource.request;
    }
}
