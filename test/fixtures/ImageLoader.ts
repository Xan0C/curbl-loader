import {LOAD_TYPE, Middleware, Resource} from "../../src";

export class ImageLoader extends Middleware<HTMLImageElement> {

    add(url: string): Middleware<HTMLImageElement> {
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

    transform(resource: Resource<HTMLImageElement>): HTMLImageElement {
        return resource.request;
    }
}
