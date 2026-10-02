import Yoga from "yoga-layout";
import type { HostChild, HostNode, HostRoot } from "../../node-interfaces.js";

// Renders the committed host tree as an indented string, e.g. "<box>\n  <text>".
export function PrintTree(root: HostRoot): string {
	// console.clear();

	const lines: string[] = [];

	const actualRoot = root.children[0] as HostNode;
	if (!actualRoot) {
		lines.push(`Root has no children`);
		return lines.join("\n");
	}

	actualRoot.yogaNode?.calculateLayout(
		undefined,
		undefined,
		Yoga.DIRECTION_LTR,
	);
	for (const child of actualRoot.children) {
		visit(child, 0, lines);
	}
	const layout = actualRoot.yogaNode?.getComputedLayout();
	if (layout) {
		lines.unshift(
			`Root layout: ${JSON.stringify({
				left: layout.left,
				top: layout.top,
				width: layout.width,
				height: layout.height,
			})}`,
		);
	}

	return lines.join("\n");
	// return "";
}

// Recursively walks a node, pushing one formatted line per node/leaf into `lines`.
function visit(node: HostChild, depth: number, lines: string[]): void {
	const indent = "   ".repeat(depth);

	// Raw text leaves have no children, just their string content.
	if (node.type === "rawtext") {
		const textYoga = node.yogaNode?.getComputedLayout();
		lines.push(`${indent}   text: "${node.text}" : ${JSON.stringify(textYoga)}`);
		return;
	}

	lines.push(`${indent}> ${node.type}`);

	const childrenExcludedProps = { ...node.props };
	delete childrenExcludedProps.children;

	lines.push(`${indent}   props: ${JSON.stringify(childrenExcludedProps)}`);
	const layout = node.yogaNode?.getComputedLayout();
	if (layout) {
		lines.push(`${indent}   totalchildren: ${node.yogaNode?.getChildCount()}`);
		lines.push(
			`${indent}   layout: ${JSON.stringify({
				left: layout.left,
				top: layout.top,
				width: layout.width,
				height: layout.height,
			})}`,
		);
	}

	lines.push(`${indent}   children:`);
	for (const child of node.children) {
		visit(child, depth + 1, lines);
	}
}
