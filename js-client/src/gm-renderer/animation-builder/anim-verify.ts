// This is a small function I had Ai generate to verify that the serialization
// works properly

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, ImageData } from "@napi-rs/canvas";
import type {
	Frame,
	FramePixelData,
	GeekMagicAnimation,
	RGBA,
} from "./index.js";

export async function ExportAnimationFrames(
	buffer: Uint8Array,
	outputDir: string,
): Promise<void> {
	const animation = DeserializeAnimation(buffer);
	await mkdir(outputDir, { recursive: true });

	const canvas = createCanvas(animation.width, animation.height);
	const ctx = canvas.getContext("2d");
	const image = ctx.createImageData(animation.width, animation.height);

	image.data.fill(0);

	for (let i = 0; i < animation.frames.length; i++) {
		const frame = animation.frames[i]!;

		for (const { x, y, color } of frame.data) {
			const offset = (y * animation.width + x) * 4;
			image.data.set(color, offset);
		}

		ctx.putImageData(image, 0, 0);

		await writeFile(
			join(outputDir, `frame_${String(i).padStart(3, "0")}.png`),
			await canvas.encode("png"),
		);
	}
}

export function DeserializeAnimation(buffer: Uint8Array): GeekMagicAnimation {
	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	const magic = new TextDecoder().decode(buffer.subarray(0, 8));
	if (magic !== "GMPANIF1") throw new Error("Invalid animation header");

	const height = view.getUint8(8);
	const width = view.getUint8(9);
	const frameCount = view.getUint16(10, true);

	let offset = 12;
	const frames: Frame[] = [];

	for (let i = 0; i < frameCount; i++) {
		const predelay = view.getUint16(offset, true);
		const pixelCount = view.getUint16(offset + 2, true);
		offset += 4;

		const data: FramePixelData[] = [];

		for (let j = 0; j < pixelCount; j++) {
			const x = view.getUint8(offset);
			const y = view.getUint8(offset + 1);
			const rgb565 = view.getUint16(offset + 2, true);
			offset += 4;

			const r5 = (rgb565 >> 11) & 0x1f;
			const g6 = (rgb565 >> 5) & 0x3f;
			const b5 = rgb565 & 0x1f;

			const color: RGBA = [
				(r5 << 3) | (r5 >> 2),
				(g6 << 2) | (g6 >> 4),
				(b5 << 3) | (b5 >> 2),
				255,
			];

			data.push({ x, y, color });
		}

		frames.push({ data, predelay });
	}

	return { width, height, frames };
}
