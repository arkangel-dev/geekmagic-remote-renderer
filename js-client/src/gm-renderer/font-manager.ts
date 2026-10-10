import type {
	GeekMagicRenderer,
	FontBlitSetting,
} from "@geekmagic-websocket/index.js";
import Convert, {
	type ConvertResult,
} from "@geekmagic-websocket/font-converter/index.js";
import { config as fontConverterConfig } from "@geekmagic-websocket/font-converter/default-config.js";
import { MaxTotalAssetSize } from "./consts.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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

/**
 * Derives the renderer's font blit metrics from the converter's raw glyph
 * output, so proportional (non-monospace) fonts measure and blit correctly.
 */
function BuildFontBlitSetting(
	vlwName: string,
	converted: Pick<
		ConvertResult,
		"ascent" | "descent" | "spaceAdvance" | "glyphs"
	>,
): FontBlitSetting {
	const glyphWidths: Record<number, number> = {};
	for (const glyph of converted.glyphs)
		glyphWidths[glyph.value] = glyph.setWidth;

	return {
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
	};
}

function GetBlitSettingsCachePath(outputDir: string, vlwName: string): string {
	return path.join(outputDir, `${vlwName}.blit.json`);
}

/**
 * Loads a previously cached FontBlitSetting for the given vlw, as long as
 * both the cache file and the vlw file it describes still exist
 */
function LoadCachedBlitSetting(
	vlwPath: string,
	cachePath: string,
): FontBlitSetting | null {
	if (!existsSync(vlwPath) || !existsSync(cachePath)) return null;
	try {
		return JSON.parse(readFileSync(cachePath, "utf8")) as FontBlitSetting;
	} catch {
		return null;
	}
}

function SaveBlitSettingCache(cachePath: string, blitSetting: FontBlitSetting) {
	writeFileSync(cachePath, JSON.stringify(blitSetting));
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
		const vlwPath = path.join(outputDir, `${vlwName}.vlw`);
		const cachePath = GetBlitSettingsCachePath(outputDir, vlwName);

		// Skip conversion entirely when the vlw and its cached blit metrics
		// are already present, since re-rendering every glyph is expensive.
		const cachedBlitSetting = LoadCachedBlitSetting(vlwPath, cachePath);
		if (cachedBlitSetting) {
			renderer.FontBlitSettings.push(cachedBlitSetting);
			loadOptions.fontFiles.push(vlwPath);
			continue;
		}

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
		// instead of hand-tuning them per font.
		const blitSetting = BuildFontBlitSetting(vlwName, converted);
		renderer.FontBlitSettings.push(blitSetting);
		SaveBlitSettingCache(cachePath, blitSetting);

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
