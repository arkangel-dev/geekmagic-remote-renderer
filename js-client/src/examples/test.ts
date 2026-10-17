import { readdirSync, writeFileSync } from "node:fs";
import { Image, loadImage } from "@napi-rs/canvas";
import {
	BuildAnimation,
	SerializeAnimation,
} from "@geekmagic-websocket/animation-builder/index.js";
import { ExportAnimationFrames } from "@geekmagic-websocket/animation-builder/anim-verify.js";
import { config } from "dotenv";
import CreateRenderer from "@geekmagic-react/create-renderer.js";

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
	predelay: 10,
	width: 240,
	height: 240,
	delta: 30,
	max_colors: 10,
	quantizer: "mediancut",
});

const serializedAnimation = SerializeAnimation(finalAnimation);

//

// console.log(`Final size: ${serializedAnimation.length / 1024} KB`);

// Convert it back
// Use this
// ffplay -loop 0 -framerate 12 -i 'frame_%03d.png' -vf "scale=800:800:flags=neighbor"
// ExportAnimationFrames(serializedAnimation, "./.test_exported_frames");

// Write to a file
writeFileSync("./ser.bin", serializedAnimation);

config();
const [renderer, _] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});



await renderer.WipeAssetsAsync();
await renderer.UploadAssetAsync("./ser.bin");
renderer.StartAnimation({
	animationId: 0,
	x: 0,
	y: 0,
	file: "ser.bin",
});
renderer.Send();

console.log("Asset uploaded successfully.");
