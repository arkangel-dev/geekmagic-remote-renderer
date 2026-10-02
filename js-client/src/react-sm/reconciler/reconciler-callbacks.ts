import Yoga from "yoga-layout";

import {
	calculateTextSize,
	wrapTextLines,
} from "../renderers/geekmagic/font-size-calculations.js";
import type {
	HostChild,
	HostNode,
	HostRawText,
	HostRoot,
} from "../node-interfaces.js";
import applyStyles from "../styles.js";
import type { Styles } from "../styles.js";
import { TextPositionDatum } from "@geekmagic-websocket/consts.js";
import { GetRenderer } from "@geekmagic-react/create-renderer.js";

/**
 * Create a new Yoga node and then apply the styles
 * to it
 */
export function CreateYogaNode(props: Record<string, unknown>) {
	const yogaNode = Yoga.Node.create();
	var style = props.style;
	const tailbreezeStyle = props.tb as string | undefined;

	if (style || tailbreezeStyle) {
		style = applyStyles(
			yogaNode,
			tailbreezeStyle,
			style as Record<string, unknown>,
		);
	}

	return [style as Styles, yogaNode] as const;
}

/**
 * Mark a node as dirty, so that it will be
 * re-rendered on the next commit
 */
export function markDirty(node: HostNode): void {
	const root = node.root;
	if (root) {
		(root.dirtyNodes ??= new Set()).add(node);
	}
}

/**
 * Mark the parent node as dirty, and if there is no
 * parent mark the node itself as dirty
 */
export function markParentDirty(node: HostNode | HostRawText): void {
	markDirty(node.parentNode ?? (node as HostNode));
}

function isTextNode(node: HostNode): boolean {
	return node.type === "baseText" || node.type === "fontText";
}

/**
 * Updates the yoga node dimensions mbased on the text, its wrapping style
 * fontsize, font family and parent
 */
export function updateTextMeasure(node: HostNode): void {
	if (!isTextNode(node) || !node.yogaNode) return;

	const text = node.children
		.filter((child): child is HostRawText => child.type === "rawtext")
		.map((child) => child.text)
		.join("");
	const style = node.style as Styles | undefined;
	const canWrap = style?.textWrap === "wrap" || style?.textWrap === "hard";
	const vlw = node.props.vlw as string;
	const blitSetting = GetRenderer().GetFontBlitSetting(vlw);
	node.yogaNode.setMeasureFunc((width, widthMode) => {
		// Only wrap once Yoga has resolved an actual width constraint for this node
		// (from its own width style or the parent's layout); otherwise measure as one line.
		if (canWrap && widthMode !== Yoga.MEASURE_MODE_UNDEFINED && width > 0) {
			const lines = wrapTextLines(text, width, vlw);
			return { width, height: lines.length * blitSetting.baseBlitSize.height };
		}

		const size = calculateTextSize(text, TextPositionDatum.TL_DATUM, vlw);
		return { width: size.width, height: size.height };
	});

	// Yoga caches a measured node's last size; setMeasureFunc alone doesn't invalidate
	// it, so the new text content wouldn't affect layout until something else dirtied
	// this node. Explicitly mark it dirty so the next calculateLayout re-measures it.
	node.yogaNode.markDirty();
}

export function hasStyleChanged(
	previousProps: Record<string, unknown>,
	nextProps: Record<string, unknown>,
): boolean {
	// Compare the style objects by converting them to JSON strings and checking for equality
	// TODO: This will not work if the style has different orders.
	// Maybe create a function to compare the styles with sorting and maybe hasing?
	return (
		JSON.stringify(previousProps.style ?? {}) !==
		JSON.stringify(nextProps.style ?? {})
	);
}

export function AppendChild(parent: HostNode, child: HostChild): void {
	if (child.parentNode) RemoveChild(child.parentNode, child);
	child.parentNode = parent;
	if (parent.root) child.root = parent.root;
	else delete child.root;
	parent.children.push(child);
	if (!isTextNode(parent) && parent.yogaNode && child.yogaNode) {
		parent.yogaNode.insertChild(
			child.yogaNode,
			parent.yogaNode.getChildCount(),
		);
	}
	updateTextMeasure(parent);
	markDirty(parent);
}

export function AppendChildToContainer(
	container: HostRoot,
	child: HostChild,
): void {
	child.root = container;
	delete child.parentNode;
	container.children.push(child);
	if (container.yogaNode && child.yogaNode) {
		container.yogaNode.insertChild(
			child.yogaNode,
			container.yogaNode.getChildCount(),
		);
	}
	markDirty(child as HostNode);
}

export function InsertBeforeNode(
	parent: HostNode,
	child: HostChild,
	beforeChild: HostChild,
): void {
	if (child.parentNode) RemoveChild(child.parentNode, child);
	const index = parent.children.indexOf(beforeChild);
	if (index === -1) {
		AppendChild(parent, child);
		return;
	}
	child.parentNode = parent;
	if (parent.root) child.root = parent.root;
	else delete child.root;
	parent.children.splice(index, 0, child);
	if (!isTextNode(parent) && parent.yogaNode && child.yogaNode)
		parent.yogaNode.insertChild(child.yogaNode, index);
	updateTextMeasure(parent);
	markDirty(parent);
}

export function InsertInContainerBefore(
	container: HostRoot,
	child: HostChild,
	beforeChild: HostChild,
): void {
	const index = container.children.indexOf(beforeChild);
	if (index === -1) {
		AppendChildToContainer(container, child);
		return;
	}
	child.root = container;
	delete child.parentNode;
	container.children.splice(index, 0, child);
	if (container.yogaNode && child.yogaNode)
		container.yogaNode.insertChild(child.yogaNode, index);
	markDirty(child as HostNode);
}

export function RemoveChild(parent: HostNode, child: HostChild): void {
	const index = parent.children.indexOf(child);
	if (index === -1) return;
	parent.children.splice(index, 1);
	if (!isTextNode(parent) && parent.yogaNode && child.yogaNode)
		parent.yogaNode.removeChild(child.yogaNode);
	updateTextMeasure(parent);
	delete child.parentNode;
	markDirty(parent);
}

export function RemoveChildFromContainer(
	container: HostRoot,
	child: HostChild,
): void {
	const index = container.children.indexOf(child);
	if (index === -1) return;
	container.children.splice(index, 1);
	if (container.yogaNode && child.yogaNode)
		container.yogaNode.removeChild(child.yogaNode);
	container.dirtyNodes?.add(child as HostNode);
}
