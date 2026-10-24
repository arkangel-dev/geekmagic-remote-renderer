import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
	BoxProps,
	ColumnElementProps,
	DitherBoxProps,
	FontTextProps,
	FrameAnimationProps,
	ImageBoxProps,
	RowElementProps,
	TextProps,
	TffFontTextProps,
} from "./node-interfaces.js";
import {
	useGeekMagicContext,
	useRenderer,
	useRequestFont,
	useUploadAsset,
} from "./hooks.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	ResizeImage,
	DownscaleBitdepth,
	ConvertToRGB565,
} from "@geekmagic-websocket/image-editing/index.js";
import crypto from "node:crypto";
import type { Image } from "@napi-rs/canvas";
import {
	BuildAnimation,
	SerializeAnimation,
} from "@geekmagic-websocket/animation-builder/index.js";

const ASSET_CACHE_DIR = ".asset_cache";
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

	const final_asset_name = useMemo(() => {
		return `${converted_slug_name}.rgb565`;
	}, [converted_slug_name]);

	useEffect(() => {
		let cancelled = false;
		async function convertImage() {
			const outputPath = path.join(
				ASSET_CACHE_DIR,
				`${converted_slug_name}.rgb565`,
			);

			const asset_list = await renderer.ListAssetsAsync();
			console.log(`Asset list:`, asset_list);
			if (
				asset_list.some(
					(asset) => asset.name === `${converted_slug_name}.rgb565`,
				)
			) {
				console.log(
					`Asset ${converted_slug_name}.rgb565 already exists on renderer`,
				);
				setIsReady(true);
				return;
			}

			// Check if its already converted
			// and exists on disk
			if (!existsSync(outputPath)) {
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
				await mkdir(ASSET_CACHE_DIR, { recursive: true });
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

	if (!isReady) return null;
	return <imageBox {...props} src={final_asset_name} />;
}

export function FrameAnimation(props: FrameAnimationProps) {
	const [isReady, setIsReady] = useState(false);

	// TODO: Implement something to get next available animation ID
	const animation_id = useRef(0);
	const quantizer = props.quantizer ?? "mediancut";
	const max_colors = props.max_colors ?? 255;
	const max_delta = props.max_delta ?? 0;
	const frame_rate = props.frameRate ?? 30;

	const final_asset_name = useMemo(() => {
		// set this to md5 hash of the source path + palette_size + quantizer
		const key = `${props.src}-${props.height}-${props.width}-${max_colors}-${quantizer}-${max_delta}-${frame_rate}`;
		return crypto.createHash("md5").update(key).digest("hex").slice(0, 8);
	}, [
		props.src,
		props.height,
		props.width,
		max_colors,
		quantizer,
		max_delta,
		frame_rate,
	]);

	const allowed_frame_types = ["png", "jpg", "jpeg", "bmp"];

	const renderer = useRenderer();
	const context = useGeekMagicContext();
	useEffect(() => {
		let cancelled = false;
		async function buildAnimation() {
			if (cancelled) return;
			const destination = `${ASSET_CACHE_DIR}/${final_asset_name}.bin`;

			const asset_list = await renderer.ListAssetsAsync();
			if (!asset_list.map((x) => x.name).includes(`${final_asset_name}.bin`)) {
				if (!existsSync(destination)) {
					// Read all the frame files from the source directory
					const frameFiles = readdirSync(props.src);
					const images: Image[] = [];
					if (cancelled) return;
					for (const file of frameFiles) {
						const filePath = `${props.src}/${file}`;
						const extension = filePath.split(".").pop()?.toLowerCase();
						if (!extension) continue;
						if (!allowed_frame_types.includes(extension)) continue;
						const image = await loadImage(filePath);
						images.push(image);
					}

					// Build the final animation from the loaded images
					const final_animation = await BuildAnimation({
						raw_images: images,
						predelay: Math.round(1000 / frame_rate),
						width: props.width,
						height: props.height,
						delta: max_delta,
						max_colors: max_colors,
						quantizer: quantizer,
					});

					// Serialize the animation to the GMPANIF1
					// fromat and save it
					const serialized_animation = SerializeAnimation(final_animation);
					await writeFile(destination, serialized_animation);
				} else {
					console.log(`Asset ${destination} already exists locally`);
				}
				await renderer.UploadAssetAsync(destination);
			} else {
				console.log(`Asset ${destination} already exists on display`);
			}

			setIsReady(true);
		}

		context.setIsAssetLoading((count) => count + 1);
		buildAnimation()
			.catch((error) =>
				console.error(`Failed to build animation ${props.src}:`, error),
			)
			.finally(() => context.setIsAssetLoading((count) => count - 1));
		return () => {
			cancelled = true;
			setIsReady(false);
		};
	}, [final_asset_name, renderer]);

	// Use layoutEffect to
	// stop the animation before the component actually
	// gets removed from the component tree.
	// That way the animations black blit doesn't impact
	// the next frame that gets rendered.
	useLayoutEffect(() => {
		return () => {
			renderer
				.StopAnimation({
					animationId: animation_id.current,
				})
				.Send();
		};
	}, [final_asset_name, renderer]);

	// Only start playback once the animation file is on the display
	if (!isReady) return null;
	return (
		<frameAnimationBox
			src={final_asset_name + ".bin"}
			animationId={animation_id.current}
			width={props.width}
			height={props.height}
		/>
	);
}
