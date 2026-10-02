import {
	asyncLocalStorage,
	GetRenderer,
} from "@geekmagic-react/create-renderer.js";
import { TextPositionDatum } from "../../../gm-renderer/consts.js";

export interface TextSize {
	width: number;
	height: number;
	xOffset: number;
	yOffset: number;
}

// Splits text into the lines it would occupy when wrapped at word boundaries
// within `maxWidth`, used to grow a wrapping text node's measured height.
export function wrapTextLines(
	text: string,
	maxWidth: number,
	vlw: string,
): string[] {
	const renderer = GetRenderer();
	const blitSetting = renderer.GetFontBlitSetting(vlw);
	const maxChars = Math.max(
		1,
		Math.floor(maxWidth / blitSetting.baseBlitSize.width),
	);
	const lines: string[] = [];

	for (const paragraph of text.split("\n")) {
		let current = "";
		for (const word of paragraph.split(" ")) {
			const candidate = current ? `${current} ${word}` : word;
			if (candidate.length > maxChars && current) {
				lines.push(current);
				current = word;
			} else {
				current = candidate;
			}
		}
		lines.push(current);
	}

	return lines.map((x) => x.substring(0, maxChars));
}

// Computes the datum-relative x/y offset for a text block of the given size.
function offsetsForDatum(
	datum: TextPositionDatum,
	width: number,
	height: number,
): { xOffset: number; yOffset: number } {
	let xOffset = 0;
	let yOffset = 0;

	switch (datum) {
		case TextPositionDatum.TC_DATUM:
		case TextPositionDatum.MC_DATUM:
		case TextPositionDatum.BC_DATUM:
		case TextPositionDatum.C_BASELINE:
			xOffset = -width / 2;
			break;
		case TextPositionDatum.TR_DATUM:
		case TextPositionDatum.MR_DATUM:
		case TextPositionDatum.BR_DATUM:
		case TextPositionDatum.R_BASELINE:
			xOffset = -width;
			break;
	}

	switch (datum) {
		case TextPositionDatum.ML_DATUM:
		case TextPositionDatum.MC_DATUM:
		case TextPositionDatum.MR_DATUM:
			yOffset = -height / 2;
			break;
		case TextPositionDatum.BL_DATUM:
		case TextPositionDatum.BC_DATUM:
		case TextPositionDatum.BR_DATUM:
			yOffset = -height;
			break;
		case TextPositionDatum.L_BASELINE:
		case TextPositionDatum.C_BASELINE:
		case TextPositionDatum.R_BASELINE:
			yOffset = -(height - 1);
			break;
	}

	return { xOffset, yOffset };
}

// The GeekMagic built-in font uses 6x8 pixel glyphs at font size 1.
export function calculateTextSize(
	text: string,
	datum: TextPositionDatum,
	vlw: string,
): TextSize {
	const renderer = GetRenderer();
	const blitSetting = renderer.GetFontBlitSetting(vlw);
	const lines = text.split("\n");
	const longestLine = Math.max(...lines.map((line) => line.length), 0);
	const width = calculateTextWidth(text, vlw);
	const height = lines.length * blitSetting.baseBlitSize.height;
	const { xOffset, yOffset } = offsetsForDatum(datum, width, height);

	return {
		width: width + 2,
		height,
		xOffset,
		yOffset,
	};
}

export function calculateTextWidth(text: string, vlw: string) {
	const renderer = GetRenderer();
	const blitSetting = renderer.GetFontBlitSetting(vlw);
	if (blitSetting.spaceWidth) {
		const spaceCount = (text.match(/\s/g) || []).length;
		const textWithoutSpaces = text.replace(/\s+/g, "");
		return textWithoutSpaces.length * blitSetting.baseBlitSize.width + spaceCount * blitSetting.spaceWidth;
	}
	return text.length * blitSetting.baseBlitSize.width;
}

/**
 * Calculate the blit size of the given text block relative to the specified datum.
 */
export function calculateTextBlitSize(text: string, datum: TextPositionDatum, vlw: string) {
	const renderer = GetRenderer();
	const blitSetting = renderer.GetFontBlitSetting(vlw);
	const lines = text.split("\n");
	const longestLine = Math.max(...lines.map((line) => line.length), 0);
	const width = calculateTextWidth(text, vlw);
	const height = lines.length * blitSetting.baseBlitSize.height;
	const { xOffset, yOffset } = offsetsForDatum(datum, width, height);

	return {
		width,
		height,
		xOffset,
		yOffset,
	};
}

// Same as calculateTextSize, but measures the block as it will actually be drawn
// when wrapped at word boundaries within maxWidth (multiple renderer.Text lines).
export function calculateWrappedTextSize(
	text: string,
	datum: TextPositionDatum,
	maxWidth: number,
	vlw: string,
): TextSize {
	const renderer = GetRenderer();
	const blitSetting = renderer.GetFontBlitSetting(vlw);
	const lines = wrapTextLines(text, maxWidth, vlw);
	const width = maxWidth;
	const height = lines.length * blitSetting.baseBlitSize.height;
	const { xOffset, yOffset } = offsetsForDatum(datum, width, height);

	return {
		width: width + 2,
		height,
		xOffset,
		yOffset,
	};
}
