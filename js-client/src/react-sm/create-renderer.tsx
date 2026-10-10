import React, { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "./reconciler/renderer.js";
import { GeekMagicRenderer } from "../gm-renderer/index.js";
import { PrintTree } from "./renderers/console-out/index.js";
import Yoga from "yoga-layout";
import type { HostRoot } from "./node-interfaces.js";
import { RenderContent } from "./renderers/geekmagic/index.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { Box } from "./elements.js";

interface AsyncLocalStorageType {
	renderer: GeekMagicRenderer;
}

export interface GeekMagicContextType {
	renderer: GeekMagicRenderer;
	isAssetLoading: boolean;
	setIsAssetLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// TODO: Stop using async local storage for the renderer context
// and use React context instead
export const asyncLocalStorage = new AsyncLocalStorage<AsyncLocalStorageType>();

export function GetRenderer() {
	const store = asyncLocalStorage.getStore();
	if (!store) {
		throw new Error("No renderer found in async local storage");
	}
	return store.renderer;
}

export const geekMagicContext = createContext<GeekMagicContextType | null>(
	null,
);

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
			root.render(
				<StateInjector renderer={renderer}>
					<Box tb="bg-[#000] flex w-[240] h-[240]">{element}</Box>
				</StateInjector>,
			);
		});
	};

	return [renderer, moddedCallback] as const;
}

function StateInjector(props: {
	renderer: GeekMagicRenderer;
	children: React.ReactNode;
}) {
	const [isAssetLoading, setIsAssetLoading] = useState(false);
	return (
		<geekMagicContext.Provider
			value={{ renderer: props.renderer, isAssetLoading, setIsAssetLoading }}
		>
			{props.children}
		</geekMagicContext.Provider>
	);
}
