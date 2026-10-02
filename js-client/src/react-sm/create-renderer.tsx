import React, { useEffect, useState } from "react";
import { createRoot } from "./reconciler/renderer.js";
import { GeekMagicRenderer } from "../gm-renderer/index.js";
import { PrintTree } from "./renderers/console-out/index.js";
import Yoga from "yoga-layout";
import type { HostRoot } from "./node-interfaces.js";
import { RenderContent } from "./renderers/geekmagic/index.js";
import { AsyncLocalStorage } from "node:async_hooks";

interface AsyncLocalStorageType {
	renderer: GeekMagicRenderer;
}

export const asyncLocalStorage = new AsyncLocalStorage<AsyncLocalStorageType>();

export function GetRenderer() {
	const store = asyncLocalStorage.getStore();
	if (!store) {
		throw new Error("No renderer found in async local storage");
	}
	return store.renderer;
}

export default async function CreateRenderer(props: {
	host: string;
	port: number;
	management_port?: number;
}) {
	const container: HostRoot = {
		id: "true-root",
		children: [],
		dirtyNodes: new Set(),
		yogaNode: Yoga.Node.create(),
	};

	const renderer = new GeekMagicRenderer({
		management_url: `http://${props.host}:${props.management_port ?? 80}`,
	});
	await renderer.ConnectAsync(props.host, props.port);

	renderer
		.FillRect({
			color: "#000",
			x: 0,
			y: 0,
			width: 240,
			height: 240,
		})
		.Send();

	const root = createRoot(container, () => {
		RenderContent(container, renderer);
		// console.log(PrintTree(container));
	});

	const moddedCallback = (element: React.ReactNode) => {
		asyncLocalStorage.run({ renderer }, () => {
			root.render(element);
		});
	};

	return [renderer, moddedCallback] as const;
}
