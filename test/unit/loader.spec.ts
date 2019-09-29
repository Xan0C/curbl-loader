import {expect} from "chai";
import {ImageLoader} from "../fixtures/ImageLoader";
import {MiddlewareData, ResourceLoader} from "../../src";

describe("ResourceLoader", () => {
    let loader:ResourceLoader;

    beforeEach(async ()=>{
        loader = new ResourceLoader();
        loader.addMiddleware(new ImageLoader, ImageLoader);
    });

    afterEach(async () => {

    });

    it("#Load Image", (done) => {
        const key = 'https://images.unsplash.com/photo-1569697473232-76541af081fd?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2134&q=80';
        loader.get(ImageLoader).add(key);
        loader.load().after((img: MiddlewareData<HTMLImageElement>) => {
           expect(img.data).to.not.eq(undefined, "img should have been loaded");
           expect(img.key).to.eq(key, "img key should be url");
           expect((img.data as HTMLImageElement).crossOrigin, "anonymous");
           done();
        });
    }).timeout(10000);

    it("#Load multiple images async ", (done) => {
        const imageLoader = loader.get(ImageLoader);

        imageLoader.add('https://images.unsplash.com/photo-1569697473232-76541af081fd?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2134&q=80');
        imageLoader.add('https://images.unsplash.com/photo-1569671313489-5659dd977ff7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2134&q=80');
        imageLoader.add('https://images.unsplash.com/photo-1569668443983-08cdc3bf8747?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=634&q=80');
        imageLoader.add('https://images.unsplash.com/photo-1569669568849-39a2939a4b65?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=634&q=80');

        let count = 0;
        loader.load().after((img: MiddlewareData<HTMLImageElement>) => {
            count++;
            if(count === 4) {
                expect(img.data).to.not.eq(undefined, "img should have been loaded");
                done();
            }
        });
    }).timeout(20000);
});