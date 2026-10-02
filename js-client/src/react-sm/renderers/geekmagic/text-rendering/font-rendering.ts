import { TextPositionDatum } from "@geekmagic-websocket/consts.js";
import {
	calculateTextBlitSize,
	calculateTextSize,
	calculateWrappedTextSize,
	wrapTextLines,
} from "../font-size-calculations.js";
import type { RenderPrimitiveElementProps } from "../index.js";
import { GetAncestorBackgroundColor, GetAncestorTextColor } from "../utils.js";

export function RenderFontText(ctx: RenderPrimitiveElementProps) {
	const { node, style, absoluteLayout, relativeLayout, renderer } = ctx;
	const textChildren = node.children.filter(
		(child) => child.type === "rawtext",
	);
	const textContent = textChildren.map((child) => child.text).join("");
	const previousTextContent = textChildren
		.map((child) => child.previousText ?? child.text)
		.join("");
	if (textContent == "") return;

	const datum = TextPositionDatum.TL_DATUM;
	const canWrap = style?.textWrap === "wrap" || style?.textWrap === "hard";
	const vlw = node.props.vlw as string;
	const blitSetting = renderer.GetFontBlitSetting(vlw);

	const previousSize = calculateTextSize(previousTextContent, datum, vlw);
	const nextSize = calculateTextSize(textContent, datum, vlw);
	const blitSize = calculateTextBlitSize(previousTextContent, datum, vlw);
	const maxWidth = Math.max(nextSize.width, blitSize.width);
	const maxHeight = Math.max(nextSize.height, blitSize.height);

	renderer.CreateSprite({
		height: maxHeight,
		width: maxWidth,
		id: 0,
		colorDepth: 6,
	});
	renderer.EnterSprite({ id: 0 });
	renderer.FillRect({
		color: GetAncestorBackgroundColor(node),
		x:
			Math.min(previousSize.xOffset, nextSize.xOffset) +
			(blitSetting.baseBlitSize.left ?? 0),
		y:
			Math.min(previousSize.yOffset, nextSize.yOffset) +
			(blitSetting.baseBlitSize.top ?? 0),
		width: Math.max(blitSize.width, nextSize.width),
		height: Math.max(blitSize.height, nextSize.height),
	});
	for (const child of textChildren) delete child.previousText;

	const lines = canWrap
		? wrapTextLines(textContent, absoluteLayout.width, vlw)
		: [textContent || "<EMPTY>"];

	// The display's built-in text draw doesn't wrap, so send one line per row.

	for (const [_, line] of lines.entries()) {
		renderer.FontText({
			text: line,
			fontName: node.props.vlw as string,
			color: style?.color ?? GetAncestorTextColor(node),
			x: 0,
			y: 0,
		});
	}
	renderer.ExitSprite();
	renderer.DrawSprite({
		id: 0,
		x: absoluteLayout.left,
		y: absoluteLayout.top,
	});
	renderer.DeleteSprite({ id: 0 });
}
