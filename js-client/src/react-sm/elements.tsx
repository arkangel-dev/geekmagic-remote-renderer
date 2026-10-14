import { useEffect, useMemo, useState } from "react";
import type {
	BoxProps,
	ColumnElementProps,
	DitherBoxProps,
	FontTextProps,
	ImageBoxProps,
	RowElementProps,
	TextProps,
	TffFontTextProps,
} from "./node-interfaces.js";
import { useRenderer, useRequestFont } from "./hooks.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	ConvertToRGB565,
	DownscaleBitdepth,
	ResizeImage,
} from "./image-editing/index.js";

const IMAGE_CACHE_DIR = ".image-cache";
const DEFAULT_COLOR_DEPTH = 8;

export function Box(props: BoxProps) {
	return <baseBox {...props} />;
}

export function DitherBox(props: DitherBoxProps) {
	return <ditherBox {...props} />;
}

export function Text(props: TextProps) {
	return <baseText {...props} />;
}

export function VlwText(props: FontTextProps) {
	return <fontText {...props} />;
}

export function TtfText(props: TffFontTextProps) {
	const [isReady, setIsReady] = useState(false);

	const fontName = props.fontPath.split("/").pop()!.split(".")[0];
	const charRange = props.characterSetRange ?? [32, 126];
	const charRangeString = charRange.join("-");
	const vlwName = `${fontName}-${props.fontSize}-${charRangeString}`;
	const requestFont = useRequestFont();
	useEffect(() => {
		let cancelled = false;
		requestFont({
			fontPath: props.fontPath,
			vlwName: vlwName,
			fontSize: props.fontSize,
			characterSetRange: charRange ?? [32, 126],
		}).then(() => {
			if (!cancelled) setIsReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, [props]);
	return isReady ? <fontText {...props} vlw={vlwName} /> : null;
}

export function Row(props: RowElementProps) {
	return (
		<baseBox
			style={{ gap: props.spacing ?? 0, display: "flex", flexDirection: "row" }}
			{...props}
		/>
	);
}

export function Column(props: ColumnElementProps) {
	return (
		<baseBox
			style={{
				gap: props.spacing ?? 0,
				display: "flex",
				flexDirection: "column",
				alignItems: props.align,
				justifyContent: props.justify,
			}}
			{...props}
		/>
	);
}

export function ImageBox(props: ImageBoxProps) {
	// Similar to the font component. Except instead of
	// rasterising a font and uploading it, we need to
	// resize an image and upload that instead

	const renderer = useRenderer();
	const [isReady, setIsReady] = useState(false);

	const converted_slug_name = useMemo(() => {
		const fileName = props.src.split("/").pop()?.split(".")[0];
		const depth = props.colorDepth ?? DEFAULT_COLOR_DEPTH;
		return `${fileName}-${depth}-${props.height}x${props.width}`;
	}, [props.src, props.colorDepth, props.height, props.width]);

	useEffect(() => {
		let cancelled = false;
		async function convertImage() {
			const outputPath = path.join(
				IMAGE_CACHE_DIR,
				`${converted_slug_name}.rgb565`,
			);

			const asset_list = await renderer.ListAssetsAsync();
			console.log(`Asset list:`, asset_list);
			if (
				asset_list.some(
					(asset) => asset.name === `${converted_slug_name}.rgb565`,
				)
			) {
				setIsReady(true);
				return;
			}

			// Check if its already converted
			// and exists on disk
			if (existsSync(outputPath)) {
				// Convert the image to the needed
				// parameters and then save it to the disk
				const image = await loadImage(props.src);
				const canvas = createCanvas(image.width, image.height);
				const ctx = canvas.getContext("2d");
				ctx.drawImage(image, 0, 0);

				let imageData = ResizeImage({
					imageData: ctx.getImageData(0, 0, image.width, image.height),
					width: props.width,
					height: props.height,
				});

				imageData = DownscaleBitdepth({
					imageData,
					colorDepth: props.colorDepth ?? DEFAULT_COLOR_DEPTH,
				});

				const converted = ConvertToRGB565({ imageData });
				if (cancelled) return;
				await mkdir(IMAGE_CACHE_DIR, { recursive: true });
				await writeFile(outputPath, converted);
			}

			await renderer.UploadAssetAsync(outputPath);
			setIsReady(true);
		}
		convertImage().catch((error) =>
			console.error(`Failed to convert image ${props.src}:`, error),
		);
		return () => {
			cancelled = true;
		};
	}, [
		converted_slug_name,
		props.src,
		props.width,
		props.height,
		props.colorDepth,
	]);

	return <imageBox {...props} />;
}
