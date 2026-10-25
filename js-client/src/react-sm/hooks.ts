import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { geekMagicContext } from "./create-renderer.js";
import { exec } from "node:child_process";
import type { Readable } from "node:stream";

export interface UseUploadAssetResult {
	uploaded: boolean;
	failed: boolean;
}

/**
 * Hook to upload an asset to the renderer.
 * @param options The options for uploading the asset, including the path.
 * @returns A boolean indicating whether the asset has been successfully uploaded.
 */
export function useUploadAsset(options: { path: string }) {
	const ctx = useGeekMagicContext();
	const [uploaded, setUploaded] = useState<UseUploadAssetResult>({
		uploaded: false,
		failed: false,
	});
	useEffect(() => {
		let cancelled = false;
		async function upload() {
			ctx.setIsAssetLoading((count) => count + 1);
			try {
				const assets = await ctx.renderer.ListAssetsAsync();
				const assetName = options.path.split("/").pop()!;
				if (!assets.some((x) => x.name === assetName))
					await ctx.renderer.UploadAssetAsync(options.path);

				if (!cancelled) setUploaded({ uploaded: true, failed: false });
			} catch {
				if (!cancelled) setUploaded({ uploaded: false, failed: true });
			} finally {
				ctx.setIsAssetLoading((count) => count - 1);
			}
		}
		void upload();
		return () => {
			cancelled = true;
		};
	}, [ctx, options.path]);

	return uploaded;
}

export function useGeekMagicContext() {
	const context = useContext(geekMagicContext);
	if (!context)
		throw new Error(
			"useGeekMagicContext must be used within a GeekMagicContext.Provider",
		);
	return context;
}

export function useRenderer() {
	const context = useContext(geekMagicContext);
	if (!context)
		throw new Error(
			"useRenderer must be used within a GeekMagicContext.Provider",
		);
	return context.renderer;
}

export function useIsAssetLoading() {
	const context = useContext(geekMagicContext);
	if (!context)
		throw new Error(
			"useIsAssetLoading must be used within a GeekMagicContext.Provider",
		);
	return context.isAssetLoading;
}

export function useRequestFont() {
	const context = useContext(geekMagicContext);
	if (!context)
		throw new Error(
			"useRequestFont must be used within a GeekMagicContext.Provider",
		);
	return context.requestFont;
}

export function usePinBinaryState(
	callback: (state: boolean) => void,
	pin: number,
) {
	const ctx = useGeekMagicContext();
	// Keep the latest callback in a ref so an inline callback doesn't
	// unregister/re-register the pin on every render.
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	useEffect(() => {
		const listener = (state: boolean) => callbackRef.current(state);
		ctx.renderer.RegisterPinStateChange({ pin, callback: listener }).Send();
		return () => {
			ctx.renderer.UnregisterPinStateChange({ pin, callback: listener }).Send();
		};
	}, [ctx.renderer, pin]);
}

export function usePinLongPress(
	callback: () => void,
	pin: number,
	duration: number = 1000,
) {
	const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
	return usePinBinaryState((state) => {
		const pressed = !state;
		if (pressed) {
			longPressTimeout.current = setTimeout(() => {
				callback();
				longPressTimeout.current = null;
			}, duration);
		} else if (longPressTimeout.current) {
			clearTimeout(longPressTimeout.current);
			longPressTimeout.current = null;
		}
	}, pin);
}

export interface UseButtonCallbackProps {
	pin: number;
	onPress?: () => void;
	onRelease?: () => void;
	onLongPress?: () => void;
	longPressDuration?: number;
}
export function useButton(options: UseButtonCallbackProps) {
	const freshLongPressRelease = useRef(false);
	if (options.onPress) {
		usePinBinaryState((state) => {
			if (!freshLongPressRelease.current) {
				if (state) {
					options.onPress?.();
				} else {
					options.onRelease?.();
				}
			}
			freshLongPressRelease.current = false;
		}, options.pin);
	}
	if (options.onLongPress) {
		usePinLongPress(
			() => {
				options.onLongPress?.();
				freshLongPressRelease.current = true;
			},
			options.pin,
			options.longPressDuration,
		);
	}
}

interface LockStateShared {
	subscribers: Set<(locked: boolean) => void>;
	interval?: ReturnType<typeof setInterval> | undefined;
	lastState: boolean | null;
	pollInFlight: boolean;
}

/**
 * Hook to get the current lock state of the device
 */
export function useLockState() {
	const renderer = useGeekMagicContext();
	const sharedKey = "_lockStateShared";

	const getShared = () => {
		let shared = renderer.miscCache.current.get(sharedKey) as
			| LockStateShared
			| undefined;
		if (!shared) {
			shared = { subscribers: new Set(), lastState: null, pollInFlight: false };
			renderer.miscCache.current.set(sharedKey, shared);
		}
		return shared;
	};

	const [locked, setLocked] = useState<boolean | null>(
		() => getShared().lastState,
	);

	async function readReableObj(readable: Readable | null): Promise<string> {
		if (!readable) return "";
		const chunks: Buffer[] = [];
		for await (const chunk of readable) chunks.push(Buffer.from(chunk));
		return Buffer.concat(chunks).toString()?.trim() ?? "";
	}

	// Check KDE state
	async function _isLinuxLockedAsync() {
		const { stdout } = await exec(
			`loginctl show-session "$(loginctl | awk -v user="$(whoami)" '$3 == user {print $1; exit}')" -p LockedHint`,
		);
		var output = await readReableObj(stdout);
		return output === "LockedHint=yes";
	}

	// Check if the device is currently locked
	async function isLocked() {
		const platform = process.platform;
		switch (platform) {
			case "linux":
				return await _isLinuxLockedAsync();
			case "win32":
				// No one really cares about windows
				return false;
			default:
				return false;
		}
	}

	useEffect(() => {
		const shared = getShared();

		async function poll() {
			if (shared.pollInFlight) return;
			shared.pollInFlight = true;
			try {
				const lockedState = await isLocked();
				shared.lastState = lockedState;
				for (const subscriber of shared.subscribers) subscriber(lockedState);
			} catch (error) {
				console.error("Failed to read lock state:", error);
			} finally {
				shared.pollInFlight = false;
			}
		}

		shared.subscribers.add(setLocked);
		if (shared.interval === undefined) {
			// First subscriber starts the single shared poller
			shared.interval = setInterval(poll, 1000);
			void poll();
		} else if (shared.lastState !== null) {
			setLocked(shared.lastState);
		}

		return () => {
			shared.subscribers.delete(setLocked);
			if (shared.subscribers.size === 0 && shared.interval !== undefined) {
				clearInterval(shared.interval);
				shared.interval = undefined;
			}
		};
	}, []);

	return locked;
}
