import { createCanvas, ImageData } from "@napi-rs/canvas";

/**
 * Resizes the image data to the given dimensions
 * and returns the result as new ImageData.
 */
export function ResizeImage(options: {
	imageData: ImageData;
	width: number;
	height: number;
}): ImageData {
	const { imageData, width, height } = options;
	if (width <= 0 || height <= 0)
		throw new Error("Width and height must be positive");

	const source = createCanvas(imageData.width, imageData.height);
	source.getContext("2d").putImageData(imageData, 0, 0);

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(source, 0, 0, width, height);
	return ctx.getImageData(0, 0, width, height);
}

/**
 * Downscales the bit depth of each color channel to `colorDepth`
 * bits (1-8). Returns new ImageData; the input is not modified.
 */
export function DownscaleBitdepth(options: {
	imageData: ImageData;
	colorDepth: number;
}): ImageData {
	const { imageData, colorDepth } = options;
	if (!Number.isInteger(colorDepth) || colorDepth < 1 || colorDepth > 8)
		throw new Error("colorDepth must be an integer between 1 and 8");

	const data = new Uint8ClampedArray(imageData.data);
	const levels = (1 << colorDepth) - 1;
	for (let i = 0; i < data.length; i += 4) {
		for (let c = 0; c < 3; c++) {
			data[i + c] = Math.round(
				(Math.round((data[i + c]! / 255) * levels) / levels) * 255,
			);
		}
	}
	return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Converts the image data to raw RGB565 pixel data
 * (2 bytes per pixel, row-major).
 * Little-endian by default; set `bigEndian` to swap the byte order.
 */
export function ConvertToRGB565(options: {
	imageData: ImageData;
	bigEndian?: boolean;
}): Buffer {
	const { data, width, height } = options.imageData;
	const out = Buffer.alloc(width * height * 2);
	for (let p = 0, i = 0; p < width * height; p++, i += 4) {
		const value =
			((data[i]! & 0xf8) << 8) |
			((data[i + 1]! & 0xfc) << 3) |
			(data[i + 2]! >> 3);
		if (options.bigEndian) out.writeUInt16BE(value, p * 2);
		else out.writeUInt16LE(value, p * 2);
	}
	return out;
}
