import { readdirSync, writeFileSync } from "node:fs";
import { Image, loadImage } from "@napi-rs/canvas";
import {
	BuildAnimation,
	SerializeAnimation,
} from "@geekmagic-websocket/animation-builder/index.js";
import { ExportAnimationFrames } from "@geekmagic-websocket/animation-builder/anim-verify.js";

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
	delta: 10
});

const serializedAnimation = SerializeAnimation(finalAnimation);
console.log(`Final size: ${serializedAnimation.length / 1024} KB`);


// Convert it back
// Use this
// ffplay -loop 0 -framerate 12 -i 'frame_%03d.png' -vf "scale=800:800:flags=neighbor"
ExportAnimationFrames(serializedAnimation, "./.test_exported_frames");