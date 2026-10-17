import type { RGBA } from "./index.js";
import { createCanvas, type Image, type ImageData } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
// The animation format stores the palette size in a single byte.
export const MAX_PALETTE_COLORS = 255;

export interface GenerateColorPaletteBase {
	raw_images: Image[];
	height: number;
	width: number;
}

/**
 * Replace a specific color with the closest match from a given palette.
 */
export function GetClosestColorIndex(options: {
	palette: RGBA[];
	color: RGBA;
}): number {
	let closestColor = options.palette[0]!;
	let closestIndex = 0;
	let smallestDistance = Number.MAX_VALUE;

	// for (const candidate of options.palette) {

	// }
	options.palette.forEach((candidate, index) => {
		const distance = Math.sqrt(
			(candidate[0]! - options.color[0]!) ** 2 +
				(candidate[1]! - options.color[1]!) ** 2 +
				(candidate[2]! - options.color[2]!) ** 2 +
				(candidate[3]! - options.color[3]!) ** 2,
		);
		if (distance < smallestDistance) {
			smallestDistance = distance;
			closestIndex = options.palette.indexOf(candidate);
			closestColor = candidate;
		}
	});

	return closestIndex;
}

export function MedianCutPalette(options: GenerateColorPaletteBase): RGBA[] {
	const { height, width } = options;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	const histogram = new Map<number, number>();

	const getImageData = (image: Image): ImageData => {
		ctx.clearRect(0, 0, width, height);
		ctx.drawImage(image, 0, 0, width, height);
		return ctx.getImageData(0, 0, width, height);
	};

	// Pack RGBA channels into a single 32-bit integer.
	const rgbaToUint = (rgba: RGBA): number =>
		(rgba[0]! << 24) | (rgba[1]! << 16) | (rgba[2]! << 8) | rgba[3]!;

	// Unpack a 32-bit integer into its RGBA channels.
	const uintToRgba = (value: number): RGBA => [
		(value >>> 24) & 0xff,
		(value >>> 16) & 0xff,
		(value >>> 8) & 0xff,
		value & 0xff,
	];

	// Build a single histogram across every animation frame.
	for (const image of options.raw_images) {
		const imageData = getImageData(image);

		for (let i = 0; i < imageData.data.length; i += 4) {
			const rgba: RGBA = [
				imageData.data[i]!,
				imageData.data[i + 1]!,
				imageData.data[i + 2]!,
				imageData.data[i + 3]!,
			];

			const packed = rgbaToUint(rgba);
			histogram.set(packed, (histogram.get(packed) ?? 0) + 1);
		}
	}

	// Each color stores its RGBA channels and the number of pixels using it.
	type Color = {
		rgba: RGBA;
		frequency: number;
	};

	const colors: Color[] = Array.from(histogram, ([packed, frequency]) => ({
		rgba: uintToRgba(packed),
		frequency,
	}));

	// No quantization is necessary if the image range has at most 256 colors.
	if (colors.length <= MAX_PALETTE_COLORS) {
		return colors.map(({ rgba }) => rgba);
	}

	// Calculate the range of a channel within a group.
	// A larger range means there is more variation along that channel.
	const getChannelRange = (group: Color[]) => {
		let widestChannel = 0;
		let widestRange = -1;

		for (let channel = 0; channel < 4; channel++) {
			let min = 255;
			let max = 0;

			for (const color of group) {
				const value = color.rgba[channel]!;
				min = Math.min(min, value);
				max = Math.max(max, value);
			}

			const range = max - min;

			if (range > widestRange) {
				widestRange = range;
				widestChannel = channel;
			}
		}

		return {
			channel: widestChannel,
			range: widestRange,
		};
	};

	// Split a group around its weighted median on the selected channel.
	const splitGroup = (group: Color[], channel: number): [Color[], Color[]] => {
		// Sort colors by the selected channel.
		const sorted = [...group].sort(
			(a, b) => a.rgba[channel]! - b.rgba[channel]!,
		);

		// Find the point where approximately half the pixels are on each side.
		const totalFrequency = sorted.reduce(
			(sum, color) => sum + color.frequency,
			0,
		);
		const halfFrequency = totalFrequency / 2;

		let accumulatedFrequency = 0;
		let splitIndex = 0;

		for (let i = 0; i < sorted.length - 1; i++) {
			accumulatedFrequency += sorted[i]!.frequency;

			if (accumulatedFrequency >= halfFrequency) {
				splitIndex = i + 1;
				break;
			}
		}

		// Ensure neither group is empty.
		splitIndex = Math.max(1, Math.min(splitIndex, sorted.length - 1));

		return [sorted.slice(0, splitIndex), sorted.slice(splitIndex)];
	};

	// Calculate a frequency-weighted average color for a group.
	const getAverageColor = (group: Color[]): RGBA => {
		let totalFrequency = 0;
		const totals = [0, 0, 0, 0];

		for (const color of group) {
			totalFrequency += color.frequency;

			for (let channel = 0; channel < 4; channel++) {
				totals[channel]! += color.rgba[channel]! * color.frequency;
			}
		}

		return [
			Math.round(totals[0]! / totalFrequency),
			Math.round(totals[1]! / totalFrequency),
			Math.round(totals[2]! / totalFrequency),
			Math.round(totals[3]! / totalFrequency),
		];
	};

	// Start with one group containing every unique color.
	const groups: Color[][] = [colors];

	// Repeatedly split the group with the greatest channel range
	// until we have 256 groups or cannot split any group further.
	while (groups.length < MAX_PALETTE_COLORS) {
		let selectedIndex = -1;
		let selectedRange = -1;
		let selectedChannel = 0;

		for (let i = 0; i < groups.length; i++) {
			const group = groups[i]!;

			// A group containing one color cannot be split.
			if (group.length < 2) {
				continue;
			}

			const { channel, range } = getChannelRange(group);

			// Prefer splitting groups with the most channel variation.
			if (range > selectedRange) {
				selectedIndex = i;
				selectedRange = range;
				selectedChannel = channel;
			}
		}

		// No groups can be split any further.
		if (selectedIndex === -1) {
			break;
		}

		const selectedGroup = groups[selectedIndex]!;
		const [left, right] = splitGroup(selectedGroup, selectedChannel);

		// Replace the selected group with its two smaller groups.
		groups.splice(selectedIndex, 1, left, right);
	}

	// Represent each group with one color to form the final palette.
	return groups.map(getAverageColor);
}

type Color = {
	rgba: RGBA;
	frequency: number;
};

// Shared histogram builder used by both algorithms.
function BuildColorHistogram(options: GenerateColorPaletteBase): Color[] {
	const { width, height } = options;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");
	const histogram = new Map<number, number>();

	for (const image of options.raw_images) {
		ctx.clearRect(0, 0, width, height);
		ctx.drawImage(image, 0, 0, width, height);

		const data = ctx.getImageData(0, 0, width, height).data;

		for (let i = 0; i < data.length; i += 4) {
			const packed =
				(data[i]! << 24) |
				(data[i + 1]! << 16) |
				(data[i + 2]! << 8) |
				data[i + 3]!;

			histogram.set(packed, (histogram.get(packed) ?? 0) + 1);
		}
	}

	return Array.from(histogram, ([packed, frequency]) => ({
		rgba: [
			(packed >>> 24) & 255,
			(packed >>> 16) & 255,
			(packed >>> 8) & 255,
			packed & 255,
		] as RGBA,
		frequency,
	}));
}

function WeightedAverageColor(colors: Color[]): RGBA {
	const totals = [0, 0, 0, 0];
	let totalFrequency = 0;

	for (const color of colors) {
		totalFrequency += color.frequency;

		for (let channel = 0; channel < 4; channel++) {
			totals[channel]! += color.rgba[channel]! * color.frequency;
		}
	}

	return totals.map((value) => Math.round(value / totalFrequency)) as RGBA;
}

// K-means quantization.
export function KMeansPalette(options: GenerateColorPaletteBase): RGBA[] {
	const colors = BuildColorHistogram(options);
	const k = Math.min(MAX_PALETTE_COLORS, colors.length);

	if (k === 0) return [];

	if (k === colors.length) {
		return colors.map(({ rgba }) => rgba);
	}

	// Squared RGBA distance. Squaring avoids an unnecessary square root.
	const distance = (a: RGBA, b: RGBA): number => {
		let result = 0;

		for (let c = 0; c < 4; c++) {
			const difference = a[c]! - b[c]!;
			result += difference * difference;
		}

		return result;
	};

	// Start with the most frequent color, then repeatedly select the color
	// farthest from the existing centers. This is deterministic initialization.
	const sorted = [...colors].sort((a, b) => b.frequency - a.frequency);
	const centers: RGBA[] = [sorted[0]!.rgba];

	while (centers.length < k) {
		let bestColor: Color | undefined;
		let bestScore = -1;

		for (const color of colors) {
			const nearestDistance = Math.min(
				...centers.map((center) => distance(color.rgba, center)),
			);

			// Frequency helps prioritize colors that occur more often.
			const score = nearestDistance * Math.sqrt(color.frequency);

			if (score > bestScore) {
				bestScore = score;
				bestColor = color;
			}
		}

		if (!bestColor || bestScore === 0) break;
		centers.push(bestColor.rgba);
	}

	// Assign each unique color to its nearest center, then recalculate
	// each center as the frequency-weighted average of its assigned colors.
	for (let iteration = 0; iteration < 30; iteration++) {
		const sums = Array.from({ length: centers.length }, () => [0, 0, 0, 0]);
		const weights = new Array(centers.length).fill(0);

		for (const color of colors) {
			let nearest = 0;
			let nearestDistance = Infinity;

			for (let i = 0; i < centers.length; i++) {
				const currentDistance = distance(color.rgba, centers[i]!);

				if (currentDistance < nearestDistance) {
					nearestDistance = currentDistance;
					nearest = i;
				}
			}

			weights[nearest] += color.frequency;

			for (let c = 0; c < 4; c++) {
				sums[nearest]![c]! += color.rgba[c]! * color.frequency;
			}
		}

		let changed = false;

		for (let i = 0; i < centers.length; i++) {
			// Keep the previous center if no colors were assigned to it.
			if (weights[i] === 0) continue;

			const nextCenter = sums[i]!.map((value) =>
				Math.round(value / weights[i]),
			) as RGBA;

			if (distance(centers[i]!, nextCenter) > 0) changed = true;
			centers[i] = nextCenter;
		}

		if (!changed) break;
	}

	return centers;
}

// Octree quantization.
type OctreeNode = {
	depth: number;
	children: Array<OctreeNode | undefined>;
	weight: number;
	sums: number[];
};

function CreateOctreeNode(depth: number): OctreeNode {
	return {
		depth,
		children: new Array<OctreeNode | undefined>(8),
		weight: 0,
		sums: [0, 0, 0, 0],
	};
}

export function OctreePalette(options: GenerateColorPaletteBase): RGBA[] {
	const colors = BuildColorHistogram(options);

	if (colors.length <= MAX_PALETTE_COLORS) {
		return colors.map(({ rgba }) => rgba);
	}

	const root = CreateOctreeNode(0);
	let leafCount = 0;

	// Insert each unique color into an RGB octree.
	// Every node accumulates weighted channel totals, so it can represent
	// all the colors beneath it if its children are later collapsed.
	for (const color of colors) {
		let node = root;

		for (let channel = 0; channel < 4; channel++) {
			node.sums[channel]! += color.rgba[channel]! * color.frequency;
		}
		node.weight += color.frequency;

		for (let depth = 0; depth < 8; depth++) {
			// Each level uses one bit from R, G and B.
			// Alpha is averaged separately rather than used to branch.
			const bit = 7 - depth;
			const index =
				(((color.rgba[0]! >> bit) & 1) << 2) |
				(((color.rgba[1]! >> bit) & 1) << 1) |
				((color.rgba[2]! >> bit) & 1);

			if (!node.children[index]) {
				node.children[index] = CreateOctreeNode(depth + 1);
				if (depth === 7) leafCount++;
			}

			node = node.children[index]!;

			for (let channel = 0; channel < 4; channel++) {
				node.sums[channel]! += color.rgba[channel]! * color.frequency;
			}
			node.weight += color.frequency;
		}
	}

	// Count the terminal leaves underneath a node.
	const countLeaves = (node: OctreeNode): number => {
		const children = node.children.filter(
			(child): child is OctreeNode => child !== undefined,
		);

		if (children.length === 0) return 1;

		return children.reduce((sum, child) => sum + countLeaves(child), 0);
	};

	// Find a deepest node that can be collapsed into one palette color.
	const findReductionCandidate = (node: OctreeNode): OctreeNode | undefined => {
		let best: OctreeNode | undefined;

		for (const child of node.children) {
			if (!child) continue;

			const candidate = findReductionCandidate(child);

			if (candidate && (!best || candidate.depth > best.depth)) {
				best = candidate;
			}
		}

		if (node.children.some((child) => child !== undefined)) {
			if (!best || node.depth > best.depth) {
				return node;
			}
		}

		return best;
	};

	// Collapse deepest branches until at most 256 leaves remain.
	while (leafCount > MAX_PALETTE_COLORS) {
		const candidate = findReductionCandidate(root);

		if (!candidate) break;

		const removedLeaves = countLeaves(candidate);
		candidate.children = new Array<OctreeNode | undefined>(8);
		leafCount -= removedLeaves - 1;
	}

	// Every remaining leaf becomes one weighted-average palette color.
	const palette: RGBA[] = [];

	const collectLeaves = (node: OctreeNode): void => {
		const children = node.children.filter(
			(child): child is OctreeNode => child !== undefined,
		);

		if (children.length === 0) {
			if (node.weight > 0) {
				palette.push(
					node.sums.map((sum) => Math.round(sum / node.weight)) as RGBA,
				);
			}

			return;
		}

		for (const child of children) {
			collectLeaves(child);
		}
	};

	collectLeaves(root);

	return palette;
}

export function GeneratePalettePng(palette: RGBA[], outputPath: string): void {
	const count = Math.min(palette.length, 256);
	const columns = 16;
	const rows = Math.ceil(count / columns);
	const cellSize = Math.floor(1000 / Math.max(columns, rows));

	const canvas = createCanvas(columns * cellSize, rows * cellSize);
	const ctx = canvas.getContext("2d");

	palette.slice(0, count).forEach(([r, g, b, a], index) => {
		const x = (index % columns) * cellSize;
		const y = Math.floor(index / columns) * cellSize;

		ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
		ctx.fillRect(x, y, cellSize, cellSize);
	});

	writeFileSync(outputPath, canvas.toBuffer("image/png"));
}
