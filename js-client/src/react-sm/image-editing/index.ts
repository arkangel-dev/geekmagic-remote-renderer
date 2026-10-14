/**
 * Accepts a byte array and resizes the image
 */
export function ResizeImage(options: {
	buffer: Buffer;
	width: number;
	height: number;
}) {}

/**
 * Accepts a byte array and downscales the image bit depth
 */
export function DownscaleBitdepth(options: {
	buffer: Buffer;
	colorDepth: number;
}) {}

/**
 * Accepts an image as a byte array and
 * converts it
 */
export function ConvertToRGB565(options: { buffer: Buffer }) {}
