import type { ReactNode } from "react";
import type { Node as YogaNode } from "yoga-layout";
import type { Styles } from "./styles.js";

export type AllowedStyleValue = string | number;
export type AllowedStyleProperty =
	| "width"
	| "height"
	| "flex"
	| "flexDirection"
	| "display"
	| "paddingRight"
	| "paddingLeft"
	| "paddingTop"
	| "paddingBottom"
	| "gap"
	| "background";

export interface BaseGeekNode {
	style?: Styles;
	tb?: string;
}

export type InternalNodeName = "baseBox" | "baseText" | "fontText" | "ditherBox";

export interface BoxProps extends BaseGeekNode {
	children?: ReactNode;
}

export interface DitherBoxProps extends BaseGeekNode {
	ditherColor?: string;
	ditherSize: number;
	children?: ReactNode;
}

export interface TextProps extends BaseGeekNode {
	children?: ReactNode;
}

export interface RowElementProps {
	children?: ReactNode;
	spacing?: number;
	align?: "start" | "middle" | "end";
	justify?: "start" | "middle" | "end";
}

export interface ColumnElementProps {
	children?: ReactNode;
	spacing?: number;
	align?: "center" | "flex-start" | "flex-end" | "stretch" | "baseline"
	justify?: "center" | "flex-start" | "flex-end" | "space-between" | "space-around" | "space-evenly"
}

export interface FontTextProps extends BaseGeekNode {
	children?: ReactNode;
	vlw?: string;
}

export interface HostNodeBase {
	yogaNode?: YogaNode;
	parentNode?: HostNode;
	root?: HostRoot;
	id: string;
}

export interface HostNode extends HostNodeBase {
	type: InternalNodeName;
	props: Record<string, unknown>;
	children: HostChild[];
	style?: Styles;
	// Last computed Yoga layout seen for this node, used to detect layout-only
	// changes (e.g. an ancestor resized/repositioned by a sibling's text wrapping)
	// that the reconciler never reported through a mutation callback.
	previousLayout?: { left: number; top: number; width: number; height: number };
}

// Leaf produced for raw string/number children (e.g. the "Hello" inside <Text>Hello</Text>).
export interface HostRawText extends HostNodeBase {
	type: "rawtext";
	text: string;
	previousText?: string;
}

export interface HostRoot extends HostNodeBase {
	children: HostChild[];
	dirtyNodes?: Set<HostNode>;
	// Fired after every commit (initial render and subsequent updates).
	onCommit?: () => void;
}

export type HostChild = HostNode | HostRawText;
