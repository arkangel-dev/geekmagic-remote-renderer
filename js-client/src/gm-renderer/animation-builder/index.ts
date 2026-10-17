import { createCanvas, Image, ImageData } from "@napi-rs/canvas";
import {
	GetClosestColorIndex,
	KMeansPalette,
	MedianCutPalette,
	OctreePalette,
	type GenerateColorPaletteBase,
} from "./color_palette_builders.js";

export interface GeekMagicAnimation {
	height: number;
	width: number;
	palette: RGBA[];
	frames: Frame[];
}

export interface Frame {
	data: FramePixelData[];
	predelay: number;
}

export interface FramePixelData {
	x: number;
	y: number;
	color_index: number;
}

export type RGBA = [number, number, number, number];

const AnimFileMagicBytes = "GMPANIF1";

function AllowDelta(previous: RGBA, current: RGBA, delta: number): boolean {
	return (
		Math.abs(current[0] - previous[0]) <= delta &&
		Math.abs(current[1] - previous[1]) <= delta &&
		Math.abs(current[2] - previous[2]) <= delta &&
		Math.abs(current[3] - previous[3]) <= delta
	);
}

export interface BuildAnimationOptions {
	predelay: number;
	raw_images: Image[];
	width?: number;
	height?: number;
	delta?: number;
	quantizer?: "mediancut" | "kmeans" | "octree";
}

/**
 * Builds a GeekMagicAnimation object from the given animation frames.
 */
export function BuildAnimation(
	options: BuildAnimationOptions,
): GeekMagicAnimation {
	const sample = options.raw_images[0];
	let quantizer: (options: GenerateColorPaletteBase) => RGBA[];

	switch (options.quantizer ?? "mediancut") {
		case "mediancut":
			quantizer = MedianCutPalette;
			break;
		case "kmeans":
			quantizer = KMeansPalette;
			break;
		case "octree":
			quantizer = OctreePalette;
			break;
	}

	const startTime = Date.now();

	if (!sample) {
		throw new Error("At least one animation frame is required");
	}

	const width = options.width ?? sample.width;
	const height = options.height ?? sample.height;
	const delta = options.delta ?? 100;
	const palette = quantizer({
		raw_images: options.raw_images,
		width,
		height,
	});

	for (const frame of options.raw_images) {
		if (frame.width !== sample.width || frame.height !== sample.height) {
			throw new Error("Inconsistent frame dimensions");
		}
	}

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	const samplePixel = (data: Uint8ClampedArray, index: number): RGBA => {
		const offset = index * 4;
		return [
			data[offset]!,
			data[offset + 1]!,
			data[offset + 2]!,
			data[offset + 3]!,
		];
	};

	const getImageData = (image: Image): ImageData => {
		ctx.clearRect(0, 0, width, height);
		ctx.drawImage(image, 0, 0, width, height);
		return ctx.getImageData(0, 0, width, height);
	};

	const firstImageData = getImageData(sample);
	const cacheFrame: RGBA[] = [];
	const frames: Frame[] = [];

	const initialFrame: Frame = {
		data: [],
		predelay: 0,
	};

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const color = samplePixel(firstImageData.data, y * width + x);

			cacheFrame.push(color);
			initialFrame.data.push({
				x,
				y,
				color_index: GetClosestColorIndex({ palette, color }),
			});
		}
	}

	frames.push(initialFrame);

	for (let index = 1; index < options.raw_images.length; index++) {
		const imageData = getImageData(options.raw_images[index]!);
		const frame: Frame = {
			data: [],
			predelay: options.predelay,
		};

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const pixelIndex = y * width + x;
				const currentColor = samplePixel(imageData.data, pixelIndex);
				const previousColor = cacheFrame[pixelIndex]!;

				if (AllowDelta(previousColor, currentColor, delta)) {
					continue;
				}

				cacheFrame[pixelIndex] = currentColor;
				const color_index = GetClosestColorIndex({
					palette,
					color: currentColor,
				});
				frame.data.push({
					x,
					y,
					color_index,
				});
			}
		}

		frames.push(frame);

		console.log(`Frame ${index} processed, changes: ${frame.data.length}`);
	}
	const endTime = Date.now();
	console.log(`Animation build time: ${endTime - startTime} ms`);

	return {
		palette,
		width,
		height,
		frames,
	};
}

function ToRGB565([r, g, b]: RGBA): number {
	return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

export function SerializeAnimation(animation: GeekMagicAnimation): Uint8Array {
	const startTime = Date.now();

	if (
		animation.width < 1 ||
		animation.width > 255 ||
		animation.height < 1 ||
		animation.height > 255
	) {
		throw new Error("Animation dimensions must fit in 1 byte");
	}

	if (animation.frames.length > 0xffff) {
		throw new Error("Frame count exceeds 65535");
	}

	if (animation.palette.length > 255) {
		throw new Error("Palette size exceeds 255");
	}

	const headerSize = 11;
	const frameCountSize = 2;
	const frameHeaderSize = 4;
	const pixelSize = 3;
	const paletteEntrySize = 2;

	let totalSize =
		headerSize +
		animation.palette.length * paletteEntrySize +
		frameCountSize;

	for (const frame of animation.frames) {
		if (frame.predelay < 0 || frame.predelay > 0xffff) {
			throw new Error("Frame predelay must fit in 2 bytes");
		}

		if (frame.data.length > 0xffff) {
			throw new Error("Frame pixel count exceeds 65535");
		}

		totalSize += frameHeaderSize + frame.data.length * pixelSize;
	}

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// Write the 8-byte magic header.
	for (let i = 0; i < AnimFileMagicBytes.length; i++) {
		bytes[i] = AnimFileMagicBytes.charCodeAt(i);
	}

	// Write animation metadata.
	view.setUint8(8, animation.height);
	view.setUint8(9, animation.width);
	view.setUint8(10, animation.palette.length);

	let offset = headerSize;

	// Write the global RGB565 palette.
	for (const color of animation.palette) {
		view.setUint16(offset, ToRGB565(color), true);
		offset += paletteEntrySize;
	}

	view.setUint16(offset, animation.frames.length, true);
	offset += frameCountSize;

	// Write frame headers and pixel deltas.
	for (const frame of animation.frames) {
		view.setUint16(offset, frame.predelay, true);
		view.setUint16(offset + 2, frame.data.length, true);
		offset += frameHeaderSize;

		for (const pixel of frame.data) {
			if (
				pixel.x < 0 ||
				pixel.x >= animation.width ||
				pixel.y < 0 ||
				pixel.y >= animation.height
			) {
				throw new Error(
					`Pixel (${pixel.x}, ${pixel.y}) is outside animation bounds`,
				);
			}

			if (
				pixel.color_index < 0 ||
				pixel.color_index >= animation.palette.length
			) {
				throw new Error(
					`Color index ${pixel.color_index} is outside palette bounds`,
				);
			}

			view.setUint8(offset, pixel.x);
			view.setUint8(offset + 1, pixel.y);
			view.setUint8(offset + 2, pixel.color_index);
			offset += pixelSize;
		}
	}

	console.log(`Animation serialization time: ${Date.now() - startTime} ms`);

	return bytes;
}
