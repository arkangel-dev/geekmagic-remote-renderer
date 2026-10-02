import Yoga from "yoga-layout";
import type {
	HostChild,
	HostNode,
	HostRoot,
} from "@geekmagic-react/node-interfaces.js";
import type { GeekMagicRenderer } from "@geekmagic-websocket/index.js";
import { TextPositionDatum } from "@geekmagic-websocket/consts.js";
import {
	calculateTextSize,
	calculateWrappedTextSize,
	wrapTextLines,
} from "@geekmagic-react/renderers/geekmagic/font-size-calculations.js";
import type { Styles } from "@geekmagic-react/styles.js";
import { markDirty } from "@geekmagic-react/reconciler/reconciler-callbacks.js";
import {
	GetParentAbsoluteLayout,
	CalculateAbsoluteLayout,
	GetAncestorBackgroundColor,
	CompareLayouts,
} from "./utils.js";
import { RenderBasicText } from "./text-rendering/base-text-rendering.js";
import { RenderFontText } from "./text-rendering/font-rendering.js";

export type Layout = {
	left: number;
	right: number;
	top: number;
	bottom: number;
	width: number;
	height: number;
};

// Renders the committed host tree as an indented string, e.g. "<box>\n  <text>".
export function RenderContent(root: HostRoot, renderer: GeekMagicRenderer) {
	const dirtyNodes = root.dirtyNodes;
	if (!dirtyNodes?.size) return;

	root.yogaNode?.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

	// Yoga recalculates the whole tree's layout on every commit. A node resizing
	// (like wrapped text growing) can shift or resize ancestors/siblings that the
	// reconciler never reported through a mutation callback, so diff every node's
	// computed layout against last commit's and mark any that moved as dirty too.
	for (const child of root.children) {
		markLayoutChanges(renderer, child, undefined);
	}

	const dirtyRoots = [...dirtyNodes].filter((node) => {
		for (let parent = node.parentNode; parent; parent = parent.parentNode) {
			if (dirtyNodes.has(parent)) return false;
		}
		return true;
	});

	for (const child of dirtyRoots) {
		visit(renderer, child, 0, GetParentAbsoluteLayout(child));
	}
	dirtyNodes.clear();
	// renderer.DebugView();
	renderer.Send();
}

function markLayoutChanges(
	renderer: GeekMagicRenderer,
	node: HostChild,
	parentLayout: Layout | undefined,
): Layout | undefined {
	if (node.type === "rawtext") return parentLayout;

	const absoluteLayout = CalculateAbsoluteLayout(node, parentLayout);
	if (absoluteLayout && !CompareLayouts(node.previousLayout, absoluteLayout)) {
		// Blit over the node's old on-screen rect with its nearest ancestor's
		// background before it (or whatever's now behind it) gets redrawn.
		if (node.previousLayout) {
			renderer.FillRect({
				color: GetAncestorBackgroundColor(node),
				x: node.previousLayout.left,
				y: node.previousLayout.top,
				width: node.previousLayout.width,
				height: node.previousLayout.height,
			});
		}

		node.previousLayout = {
			left: absoluteLayout.left,
			top: absoluteLayout.top,
			width: absoluteLayout.width,
			height: absoluteLayout.height,
		};
		markDirty(node);
	}

	for (const child of node.children) {
		markLayoutChanges(renderer, child, absoluteLayout);
	}

	return absoluteLayout;
}

// Recursively walks a node, pushing one formatted line per node/leaf into `lines`.
function visit(
	renderer: GeekMagicRenderer,
	node: HostChild,
	depth: number,
	parentLayout?: Layout,
) {
	// Raw text leaves have no children, just their string content.
	if (node.type === "rawtext") {
		var layoutPos = node.yogaNode?.getComputedLayout();
		return;
	}

	const childrenExcludedProps = { ...node.props };
	delete childrenExcludedProps.children;

	var relativeLayout = node.yogaNode?.getComputedLayout();
	var absoluteLayout = CalculateAbsoluteLayout(node, parentLayout);

	const style = node.style as Styles;

	if (absoluteLayout && relativeLayout) {
		const renderContext: RenderPrimitiveElementProps = {
			node,
			style,
			absoluteLayout: absoluteLayout!,
			relativeLayout: relativeLayout!,
			renderer,
		};
		switch (node.type) {
			case "baseBox":
				RenderBox(renderContext);
				break;

			case "ditherBox":
				RenderDitherBox(renderContext);
				break;

			case "baseText":
				RenderBasicText(renderContext);
				break;

			case "fontText":
				RenderFontText(renderContext);
				break;
		}
	}

	for (const child of node.children) {
		visit(renderer, child, depth + 1, absoluteLayout);
	}
}

export interface RenderPrimitiveElementProps {
	node: HostNode;
	style: Styles;
	absoluteLayout: Layout;
	relativeLayout: Layout;
	renderer: GeekMagicRenderer;
}

function RenderBox(ctx: RenderPrimitiveElementProps) {
	const { node, style, absoluteLayout, relativeLayout, renderer } = ctx;
	if (!style) return;
	if (style.backgroundColor)
		renderer.FillRect({
			color: style.backgroundColor,
			x: absoluteLayout.left,
			y: absoluteLayout.top,
			width: absoluteLayout.width,
			height: absoluteLayout.height,
			borderRadius: style?.borderRadius ?? 0,
		});

	const borderColor = node.style?.borderColor;
	if (borderColor) {
		renderer.Rect({
			color: borderColor,
			thickness: node.style?.borderWidth ?? 1,
			x: absoluteLayout.left,
			y: absoluteLayout.top,
			width: absoluteLayout.width,
			height: absoluteLayout.height,
			borderRadius: style?.borderRadius ?? 0,
		});
	}
}

function RenderDitherBox(ctx: RenderPrimitiveElementProps) {
	const { node, style, absoluteLayout, relativeLayout, renderer } = ctx;
	if (!style) return;
	if (style.backgroundColor)
		renderer.FillDitherRect({
			color: style.backgroundColor,
			x: absoluteLayout.left,
			y: absoluteLayout.top,
			width: absoluteLayout.width,
			height: absoluteLayout.height,
			ditherColor: node.props.ditherColor as string ?? "#000",
			ditherSize: node.props.ditherSize as number,
		});
}
