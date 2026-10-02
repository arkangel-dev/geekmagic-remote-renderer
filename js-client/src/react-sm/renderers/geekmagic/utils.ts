import type { HostNode, HostChild } from "@geekmagic-react/node-interfaces.js";
import type { Styles } from "@geekmagic-react/styles.js";
import type { Layout } from "./index.js";
import { env } from "process";

// A dirty subtree's Yoga positions are relative to its parent, not the display.
export function GetParentAbsoluteLayout(node: HostNode): Layout | undefined {
	const parent = node.parentNode;
	if (!parent) return undefined;

	return CalculateAbsoluteLayout(parent, GetParentAbsoluteLayout(parent));
}

export function CalculateAbsoluteLayout(
	node: HostChild,
	parentLayout?: Layout,
): Layout | undefined {
	const layout = node.yogaNode?.getComputedLayout();
	if (!layout) {
		return parentLayout;
	}

	const absoluteLayout: Layout = {
		left: (parentLayout?.left ?? 0) + layout.left,
		right: (parentLayout?.left ?? 0) + layout.left + layout.width,
		top: (parentLayout?.top ?? 0) + layout.top,
		bottom: (parentLayout?.top ?? 0) + layout.top + layout.height,
		width: layout.width,
		height: layout.height,
	};

	return absoluteLayout;
}

export function GetAncestorBackgroundColor(node: HostNode): string {
	if (env.DEV_BLIT_MODE) return "#eb34d5";
	let parent: HostNode | undefined = node.parentNode;
	while (parent) {
		const color = (parent.style as Styles | undefined)?.backgroundColor;
		if (typeof color === "string") return color;
		parent = parent.parentNode;
	}
	return "#000";
}

export function GetAncestorTextColor(node: HostNode): string {
	let parent: HostNode | undefined = node.parentNode;
	while (parent) {
		const color = (parent.style as Styles | undefined)?.color;
		if (typeof color === "string") return color;
		parent = parent.parentNode;
	}
	return "#fff";
}

export function CompareLayouts(
	a: { left: number; top: number; width: number; height: number } | undefined,
	b: { left: number; top: number; width: number; height: number },
): boolean {
	return (
		a !== undefined &&
		a.left === b.left &&
		a.top === b.top &&
		a.width === b.width &&
		a.height === b.height
	);
}
