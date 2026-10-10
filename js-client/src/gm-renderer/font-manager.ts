import type { GeekMagicRenderer } from "@geekmagic-websocket/index.js";
import Convert from "@geekmagic-websocket/font-converter/index.js";
import { config as fontConverterConfig } from "@geekmagic-websocket/font-converter/default-config.js";
import { MaxTotalAssetSize } from "./consts.js";
import { existsSync } from "node:fs";

export interface FontLoadOptions {
	renderer: GeekMagicRenderer;
	fontFiles: string[];
}

export interface FontImportSettings {
	/**
	 * The path to the font file.
	 * Expects a TTF file
	 */
	fontPath: string;
	/**
	 * The name of the VLW name that will be
	 * used in the FontText component to refer
	 * to this font
	 */
	vlwName: string;

	fontSize: number;

	/**
	 * Describes the range of characters included in this font.
	 */
	characterSetRange: [number, number];
}

export async function LoadFontsAsync(
	renderer: GeekMagicRenderer,
	fonts: FontImportSettings[],
) {
	const loadOptions: FontLoadOptions = {
		renderer,
		fontFiles: [],
	};
	for (const font of fonts) {
		const { fontPath, vlwName, fontSize, characterSetRange } = font;
		const outputDir = fontConverterConfig.outputDir;

		// `BuildCharset` reads the character range directly off the shared
		// `fontConverterConfig` singleton, so it must be mutated here rather
		// than just passed through `Convert`'s `setConf` argument.
		fontConverterConfig.unicodeBlocks = [characterSetRange];
		fontConverterConfig.specificUnicodes = [];
		const converted = Convert({
			...fontConverterConfig,
			fontFile: fontPath,
			outputName: vlwName,
			outputDir,
			fontSize,
			createPreview: false,
		});

		// Build the blit settings straight from the converter's glyph metrics
		// instead of hand-tuning them per font. Every glyph's own advance width
		// is recorded, so proportional (non-monospace) fonts measure and blit
		// correctly instead of assuming a single fixed character width.
		const glyphWidths: Record<number, number> = {};
		for (const glyph of converted.glyphs)
			glyphWidths[glyph.value] = glyph.setWidth;

		renderer.FontBlitSettings.push({
			vlwName,
			baseBlitSize: {
				// Fallback width for characters outside the requested range.
				width: converted.spaceAdvance,
				height: converted.ascent + converted.descent,
				top: 0,
				left: 0,
			},
			spaceWidth: converted.spaceAdvance,
			glyphWidths,
		});

		loadOptions.fontFiles.push(converted.vlwPath);
	}

	const existingAssetsResponse = await renderer.ListAssetsAsync();
	// If any of them are missing, Wipe the existing
	// assets and upload the required font files.
	const existingAssetNames = existingAssetsResponse.map((x) => x.name);
	const currentUsedSize = existingAssetsResponse.reduce(
		(acc, asset) => acc + asset.size,
		0,
	);
	if (currentUsedSize > MaxTotalAssetSize) {
		await renderer.WipeAssetsAsync();
	}

	const missingFontFiles = loadOptions.fontFiles.filter(
		(assetPath) => !existingAssetNames.includes(assetPath.split("/").pop()!),
	);
	if (missingFontFiles.length > 0) {
		for (const assetPath of loadOptions.fontFiles) {
			process.stdout.write(`Uploading asset: ${assetPath}...`);
			await renderer.UploadAssetAsync(assetPath);
			process.stdout.write(` Done\n`);
		}
	}
}
