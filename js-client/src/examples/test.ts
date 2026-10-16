import { readdirSync, writeFileSync } from "node:fs";
import { Image, loadImage } from "@napi-rs/canvas";
import {
	BuildAnimation,
	SerializeAnimation,
} from "@geekmagic-websocket/animation-builder/index.js";

const frameFolder = "./example_assets/coin_frames";
const frameFiles = readdirSync(frameFolder);
const images: Image[] = [];
for (const file of frameFiles) {
	const filePath = `${frameFolder}/${file}`;
	const image = await loadImage(filePath);
	images.push(image);
}

const finalAnimation = BuildAnimation({
	raw_images: images,
	predelay: 100,
	width: 100,
	height: 100,
});

const serializedAnimation = SerializeAnimation(finalAnimation);
writeFileSync("./finalAnimation.bin", serializedAnimation);
