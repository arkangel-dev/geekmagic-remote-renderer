import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { createRoot } from "./reconciler/renderer.js";
import { GeekMagicRenderer } from "../gm-renderer/index.js";
import { PrintTree } from "./renderers/console-out/index.js";
import Yoga from "yoga-layout";
import type { HostRoot } from "./node-interfaces.js";
import { RenderContent } from "./renderers/geekmagic/index.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { Box } from "./elements.js";
import {
	LoadFontsAsync,
	type FontImportSettings,
} from "@geekmagic-websocket/font-manager.js";

interface AsyncLocalStorageType {
	renderer: GeekMagicRenderer;
}

export interface GeekMagicContextType {
	renderer: GeekMagicRenderer;
	isAssetLoading: boolean;
	setIsAssetLoading: React.Dispatch<React.SetStateAction<boolean>>;
	/**
	 * Queues a font for loading and returns a promise that resolves once it
	 * and other fonts requested in the same tick are loaded in.
	 */
	requestFont: (settings: FontImportSettings) => Promise<void>;
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
		// This is needed for making sure that renderer 
		// is available for when commits are triggered via 
		// state updates from the box
		asyncLocalStorage.run({ renderer }, () => RenderContent(container, renderer));
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

interface FontBatchState {
	/** Fonts queued since the last flush, keyed by vlwName. */
	pending: Map<string, FontImportSettings>;
	/** Promise returned to callers for each vlwName, resolved once loaded. */
	promises: Map<string, Promise<void>>;
	/** Resolve/reject pair for each pending vlwName's promise. */
	resolvers: Map<
		string,
		{
			resolve: () => void;
			reject: (reason: unknown) => void;
		}
	>;
	/** Whether a flush microtask has already been scheduled. */
	scheduled: boolean;
}

function StateInjector(props: {
	renderer: GeekMagicRenderer;
	children: React.ReactNode;
}) {
	const [isAssetLoading, setIsAssetLoading] = useState(false);
	const fontBatchRef = useRef<FontBatchState>({
		pending: new Map(),
		promises: new Map(),
		resolvers: new Map(),
		scheduled: false,
	});

	// Flushes every font queued so far in a single LoadFontsAsync call, rather
	// than converting/uploading one font per `TffFontText` instance. Queuing
	// via a microtask lets every component mounted in the same commit add its
	// font before the batch is sent.
	const flushFontBatch = useCallback(() => {
		const batch = fontBatchRef.current;
		batch.scheduled = false;
		if (batch.pending.size === 0) return;

		const fontsToLoad = Array.from(batch.pending.values());
		batch.pending.clear();

		setIsAssetLoading(true);
		LoadFontsAsync(props.renderer, fontsToLoad)
			.then(() => {
				for (const font of fontsToLoad) {
					batch.resolvers.get(font.vlwName)?.resolve();
					batch.resolvers.delete(font.vlwName);
				}
			})
			.catch((error) => {
				for (const font of fontsToLoad) {
					batch.resolvers.get(font.vlwName)?.reject(error);
					batch.resolvers.delete(font.vlwName);
					// Allow a future request for this font to retry instead of
					// permanently returning a rejected promise.
					batch.promises.delete(font.vlwName);
				}
			})
			.finally(() => setIsAssetLoading(false));
	}, [props.renderer]);

	const requestFont = useCallback(
		(settings: FontImportSettings) => {
			const batch = fontBatchRef.current;
			const existing = batch.promises.get(settings.vlwName);
			if (existing) return existing;

			const promise = new Promise<void>((resolve, reject) => {
				batch.resolvers.set(settings.vlwName, { resolve, reject });
			});
			batch.promises.set(settings.vlwName, promise);
			batch.pending.set(settings.vlwName, settings);

			if (!batch.scheduled) {
				batch.scheduled = true;
				queueMicrotask(flushFontBatch);
			}

			return promise;
		},
		[flushFontBatch],
	);

	return (
		<geekMagicContext.Provider
			value={{
				renderer: props.renderer,
				isAssetLoading,
				setIsAssetLoading,
				requestFont,
			}}
		>
			{props.children}
		</geekMagicContext.Provider>
	);
}
