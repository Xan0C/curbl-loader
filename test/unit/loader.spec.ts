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
        loader.get(ImageLoader).add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-727341.jpg");
        loader.load().after((img: MiddlewareData<HTMLImageElement>) => {
           expect(img.data).to.not.eq(undefined, "img should have been loaded");
           expect(img.key).to.eq("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-727341.jpg", "img key should be url");
           expect((img.data as HTMLImageElement).crossOrigin, "anonymous");
           done();
        });
    }).timeout(10000);

    it("#Load multiple images async ", (done) => {
        const imageLoader = loader.get(ImageLoader);

        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-727341.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-736090.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-727278.png");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-699858.jpg");

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