import { readdirSync } from "node:fs";
import { Image, loadImage } from "@napi-rs/canvas";
import { BuildAnimation } from "@geekmagic-websocket/animation-builder/index.js";

const frameFolder = "./example_assets/coin_frames";
const frameFiles = readdirSync(frameFolder);
const images: Image[] = [];
for (const file of frameFiles) {
	const filePath = `${frameFolder}/${file}`;
	const image = await loadImage(filePath);
	images.push(image);
}

const finalAnimation = BuildAnimation(images);
console.log(JSON.stringify(finalAnimation, null, 2));
