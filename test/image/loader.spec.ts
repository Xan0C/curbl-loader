import {ResourceLoader} from "../../lib";
import {expect} from "chai";
import {ImageLoader} from "../fixture/ImageLoader";

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
        loader.load().after((img: HTMLImageElement) => {
           expect(img).to.not.eq(undefined, "img should have been loaded");
           done();
        });
    }).timeout(10000);

    it("#Load multiple images async ", (done) => {
        const imageLoader = loader.get(ImageLoader);

        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-727341.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-736090.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-727278.png");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-699858.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-708677.png");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-704146.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-682481.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-694540.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-700301.png");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-697696.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-722657.jpg");
        imageLoader.add("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-698246.jpg");

        let count = 0;
        loader.load().after((img: HTMLImageElement) => {
            console.log("Image src: ", img.src);
            count++;
            if(count === 12) {
                expect(img).to.not.eq(undefined, "img should have been loaded");
                done();
            }
        });
    }).timeout(10000);
});