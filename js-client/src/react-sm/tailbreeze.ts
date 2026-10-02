import type { Styles } from "./styles.js";

function parseValue(value: string): string | number {
	if (value.endsWith("px")) {
		return parseFloat(value.slice(0, -2));
	}
	if (value.endsWith("%")) {
		return value;
	}
	if (value.endsWith("em")) {
		return parseFloat(value.slice(0, -2));
	}
	if (value.endsWith("rem")) {
		return parseFloat(value.slice(0, -3));
	}

	// is number
	if (!isNaN(Number(value))) {
		return Number(value);
	}
	return value;
}

export function cn(...tags: string[]): string {
	return tags.join(" ");
}

export function ConvertToTailbreeze(style: Styles, ...tags: string[]): Styles {
	const singleTags: string[] = [];

	// Handle tags like bg-[#ff0] or h-[100] and stuff like that
	const tagVerificationRegex = /^(?<property>[a-z-]+)-\[(?<value>.+)\]$/;
	for (const tagList of tags) {
		for (const tag of tagList.split(" ")) {
			const match = tagVerificationRegex.exec(tag);
			if (!match) {
				singleTags.push(tag);
				continue;
			}
			const { groups } = match;

			const property = groups?.property;
			const value = groups?.value;

			if (!property || !value) continue;
			switch (property) {
				case "bg":
					style.backgroundColor = value;
					break;

				case "flex":
					style.flex = parseValue(value);
					break;

				case "gap":
					style.gap = Number.parseFloat(value);
					break;

				case "p":
					style.padding = Number.parseFloat(value);
					break;

				case "rounded":
					style.borderRadius = Number.parseFloat(value);
					break;

				case "basis":
					style.flexBasis = parseValue(value);
					break;

				case "shrink":
					style.flexShrink = Number.parseFloat(value);
					break;

				case "w":
					style.width = parseValue(value);
					break;

				case "h":
					style.height = parseValue(value);
					break;

				case "border":
					style.borderColor = value;
					break;

				case "border-color":
					break;

				case "text":
					style.color = value;
					break;

				case "top":
					style.top = Number.parseFloat(value);
					break;

				case "left":
					style.left = Number.parseFloat(value);
					break;

				case "right":
					style.right = Number.parseFloat(value);
					break;

				case "bottom":
					style.bottom = Number.parseFloat(value);
					break;

				case "px":
					style.paddingX = Number.parseFloat(value);
					break;

				case "pl":
					style.paddingLeft = Number.parseFloat(value);
					break;

				case "pt":
					style.paddingTop = Number.parseFloat(value);
					break;

				case "py":
					style.paddingY = Number.parseFloat(value);
					break;

				case "mt":
					style.marginTop = Number.parseFloat(value);
					break;

				case "m":
					style.margin = Number.parseFloat(value);
					break;

				default:
					throw new Error(`Unsupported Tailbreeze ${property} in tag ${tag}`);
			}
		}
	}

	for (const tag of singleTags) {
		if (!tag) continue;
		switch (tag) {
			case "flex":
				style.display = "flex";
				break;
			case "flex-row":
				style.flexDirection = "row";
				break;
			case "flex-col":
				style.flexDirection = "column";
				break;
			case "flex-wrap":
				style.flexWrap = "wrap";
				break;
			case "flex-nowrap":
				style.flexWrap = "nowrap";
				break;
			case "flex-wrap-reverse":
				style.flexWrap = "wrap-reverse";
				break;
			case "items-start":
				style.alignItems = "flex-start";
				break;
			case "items-center":
				style.alignItems = "center";
				break;
			case "items-end":
				style.alignItems = "flex-end";
				break;
			case "justify-start":
				style.justifyContent = "flex-start";
				break;
			case "justify-center":
				style.justifyContent = "center";
				break;
			case "justify-end":
				style.justifyContent = "flex-end";
				break;
			case "content-start":
				style.alignContent = "flex-start";
				break;
			case "content-center":
				style.alignContent = "center";
				break;
			case "content-end":
				style.alignContent = "flex-end";
				break;
			case "relative":
				style.position = "relative";
				break;
			case "absolute":
				style.position = "absolute";
				break;
			case "fixed":
				style.position = "fixed";
				break;
			case "w-fit":
				style.width = "fit-content";
				break;
			case "h-fit":
				style.height = "fit-content";
				break;
			case "justify-between":
				style.justifyContent = "space-between";
				break;
			case "text-wrap":
				style.textWrap = "wrap";
				break;
			case "w-full":
				style.width = "100%";
				break;
			case "h-full":
				style.height = "100%";
				break;
			default:
				throw new Error(`Unsupported Tailbreeze tag ${tag}`);
		}
	}
	return style;
}
