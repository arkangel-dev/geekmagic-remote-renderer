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
	const renderer = useRenderer();
	const [uploaded, setUploaded] = useState<UseUploadAssetResult>({
		uploaded: false,
		failed: false,
	});
	useEffect(() => {
		let cancelled = false;
		async function upload() {
			try {
				const assets = await renderer.ListAssetsAsync();
				const assetName = options.path.split("/").pop()!;
				if (!assets.some((x) => x.name === assetName))
					await renderer.UploadAssetAsync(options.path);

				if (!cancelled) setUploaded({ uploaded: true, failed: false });
			} catch {
				if (!cancelled) setUploaded({ uploaded: false, failed: true });
			}
		}
		void upload();
		return () => {
			cancelled = true;
		};
	}, [renderer, options.path]);

	return uploaded;
}

export function useRenderer() {
	const context = useContext(geekMagicContext);
	if (!context) {
		throw new Error(
			"useRenderer must be used within a GeekMagicContext.Provider",
		);
	}
	return context.renderer;
}
