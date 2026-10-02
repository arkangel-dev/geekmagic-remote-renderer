import { TextPositionDatum } from "@geekmagic-websocket/consts.js";
import {
	calculateTextSize,
	calculateWrappedTextSize,
	wrapTextLines,
} from "../font-size-calculations.js";
import type { RenderPrimitiveElementProps } from "../index.js";
import { GetAncestorBackgroundColor, GetAncestorTextColor } from "../utils.js";

export function RenderBasicText(ctx: RenderPrimitiveElementProps) {
	const { node, style, absoluteLayout, renderer } = ctx;
	const textChildren = node.children.filter(
		(child) => child.type === "rawtext",
	);
	const textContent = textChildren.map((child) => child.text).join("");
	const previousTextContent = textChildren
		.map((child) => child.previousText ?? child.text)
		.join("");
	const hasTextChanged = textChildren.some(
		(child) => child.previousText !== undefined,
	);
	if (textContent == "") return;

	const datum = TextPositionDatum.TL_DATUM;
	const fontSize = 1;
	const canWrap = style?.textWrap === "wrap" || style?.textWrap === "hard";
	const vlw = node.props.vlw as string;
	const blitSetting = renderer.GetFontBlitSetting(vlw);
    
	if (hasTextChanged) {
		const previousSize = canWrap
			? calculateWrappedTextSize(
					previousTextContent,
					datum,
					absoluteLayout.width,
					vlw,
				)
			: calculateTextSize(previousTextContent, datum, vlw);
		const nextSize = canWrap
			? calculateWrappedTextSize(textContent, datum, absoluteLayout.width, vlw)
			: calculateTextSize(textContent, datum, vlw);
		renderer.FillRect({
			color: GetAncestorBackgroundColor(node),
			x:
				absoluteLayout.left +
				Math.min(previousSize.xOffset, nextSize.xOffset) +
				(blitSetting.baseBlitSize.left ?? 0),
			y:
				absoluteLayout.top +
				Math.min(previousSize.yOffset, nextSize.yOffset) +
				(blitSetting.baseBlitSize.top ?? 0),
			width: Math.max(previousSize.width, nextSize.width),
			height: Math.max(previousSize.height, nextSize.height),
		});
		for (const child of textChildren) delete child.previousText;
	}

	const lines = canWrap
		? wrapTextLines(textContent, absoluteLayout.width, vlw)
		: [textContent || "<EMPTY>"];

	// The display's built-in text draw doesn't wrap, so send one line per row.

	const fontColor = style?.color ?? GetAncestorTextColor(node)

	for (const [index, line] of lines.entries()) {
		if (node.props.vlw) {
			renderer.FontText({
				text: line,
				fontName: node.props.vlw as string,
				color: fontColor,
				x: absoluteLayout.left,
				y: absoluteLayout.top + index * blitSetting.baseBlitSize.height,
			});
			continue;
		}
		renderer.Text({
			text: line,
			x: absoluteLayout.left,
			y: absoluteLayout.top + index * blitSetting.baseBlitSize.height,
			color: fontColor,
			fontSize,
		});
	}
}
