import { useCallback, useContext, useEffect, useState } from "react";
import { geekMagicContext } from "./create-renderer.js";

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
			ctx.setIsAssetLoading(true);
			try {
				const assets = await ctx.renderer.ListAssetsAsync();
				const assetName = options.path.split("/").pop()!;
				if (!assets.some((x) => x.name === assetName))
					await ctx.renderer.UploadAssetAsync(options.path);

				if (!cancelled) setUploaded({ uploaded: true, failed: false });
			} catch {
				if (!cancelled) setUploaded({ uploaded: false, failed: true });
			} finally {
				ctx.setIsAssetLoading(false);
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
	useEffect(() => {
		const callbackWrapper = (state: boolean) => {
			callback(state);
		};
		ctx.renderer.RegisterPinStateChange({
			pin,
			callback: callbackWrapper,
		});
		return () => {
			ctx.renderer.UnregisterPinStateChange({ pin: pin });
		};
	}, [ctx, callback, pin]);
}
