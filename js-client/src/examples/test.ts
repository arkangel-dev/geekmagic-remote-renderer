import { readdirSync, writeFileSync } from "node:fs";
import { Image, loadImage } from "@napi-rs/canvas";
import {
	BuildAnimation,
	SerializeAnimation,
} from "@geekmagic-websocket/animation-builder/index.js";
import { ExportAnimationFrames } from "@geekmagic-websocket/animation-builder/anim-verify.js";
import {
	GeneratePalettePng,
	KMeansPalette,
	MedianCutPalette,
	OctreePalette,
} from "@geekmagic-websocket/animation-builder/color_palette_builders.js";

const frameFolder = "./example_assets/coin_frames";
const frameFiles = readdirSync(frameFolder);
const images: Image[] = [];
for (const file of frameFiles) {
	const filePath = `${frameFolder}/${file}`;
	const image = await loadImage(filePath);
	images.push(image);
}

// let start = Date.now();
// let palette = MedianCutPalette({
// 	raw_images: images,
// 	height: 240,
// 	width: 240,
// });
// console.log(`MedianCutPalette took ${Date.now() - start} ms`);
// GeneratePalettePng(palette, "MedianCutPalette.png");

// start = Date.now();
// palette = KMeansPalette({
// 	raw_images: images,
// 	height: 240,
// 	width: 240,
// });
// console.log(`KMeansPalette took ${Date.now() - start} ms`);
// GeneratePalettePng(palette, "KMeansPalette.png");

// start = Date.now();
// palette = OctreePalette({
// 	raw_images: images,
// 	height: 240,
// 	width: 240,
// });
// console.log(`OctreePalette took ${Date.now() - start} ms`);
// GeneratePalettePng(palette, "OctreePalette.png");

const finalAnimation = BuildAnimation({
	raw_images: images,
	predelay: 100,
	width: 240,
	height: 240,
	delta: 30
});

const serializedAnimation = SerializeAnimation(finalAnimation);
console.log(`Final size: ${serializedAnimation.length / 1024} KB`);

// Convert it back
// Use this
// ffplay -loop 0 -framerate 12 -i 'frame_%03d.png' -vf "scale=800:800:flags=neighbor"
ExportAnimationFrames(serializedAnimation, "./.test_exported_frames");
