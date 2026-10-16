import { createCanvas, Image, ImageData } from "@napi-rs/canvas";

interface GeekMagicAnimation {
	height: number;
	width: number;
	frames: Frame[];
}

interface Frame {
	data: FramePixelData[];
	predelay: number;
}

interface FramePixelData {
	x: number;
	y: number;
	color: number;
}

function AllowDelta(previous: number, current: number, delta: number): boolean {
	return Math.abs(current - previous) <= delta;
}

/**
 * Builds a GeekMagicAnimation object from the given animation frames.
 */
export function BuildAnimation(rawImages: Image[]): GeekMagicAnimation {
	const sample = rawImages[0]!;

	// Make sure dimension consistency
	for (const frame of rawImages) {
		if (frame.height != sample.height || frame.width != sample.width)
			throw new Error("Inconsistent frame dimensions");
	}

	const canvas = createCanvas(sample.width, sample.height);
	const ctx = canvas.getContext("2d");

	const getImageData = (image: Image): ImageData => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
		return ctx.getImageData(0, 0, canvas.width, canvas.height);
	};

	// Construct the initial full frame pixel data array
	let cacheFrame: FramePixelData[] = [];
	let frameData: Frame[] = [];

	for (let x = 0; x < sample.height; x++) {
		for (let y = 0; y < sample.width; y++) {
			const imageData = getImageData(sample);
			const sampleFrameColor = imageData.data[x * y]!;
			cacheFrame.push({ x, y, color: sampleFrameColor });
		}
	}

	rawImages.forEach((frame, index) => {
		let cur_newFrame: Frame = { data: [], predelay: 0 };
		for (let x = 0; x < sample.height; x++) {
			for (let y = 0; y < sample.width; y++) {
				const imageData = getImageData(frame);
				const currentColor = imageData.data[x * y]!;
				const previousColor = cacheFrame[x * sample.width + y]!.color;

				// If the change isn't big enough, skip updating the cache;
				if (AllowDelta(previousColor, currentColor, 0)) continue;

				// Update the cached frame with the new color
				cacheFrame[x * sample.width + y]!.color = currentColor;
				cur_newFrame.data.push({ x, y, color: currentColor });
			}
		}
		frameData.push(cur_newFrame);
	});

	return {
		height: sample.height,
		width: sample.width,
		frames: frameData,
	};
}
