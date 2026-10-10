/**
 * TypeScript port of Bodmer's Processing "Create_font" sketch for TFT_eSPI.
 * Converts a .ttf/.otf file into a Processing-format .vlw smooth font
 * (and optionally a C header) that TFT_eSPI's loadFont() can read.
 *
 *   npm i opentype.js @napi-rs/canvas
 *   npm i -D tsx @types/node @types/opentype.js
 *   npx tsx create-font.ts [fontFile] [fontSize] [outputName]
 *
 * Original sketch: Copyright (c) 2018 Bodmer, FreeBSD License.
 */
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import type { VlwGlyph } from "./font-converter-interfaces.js";
import { config } from "./default-config.js";
import { RenderGlyph } from "./render-glyph.js";
import { BuildCharset } from "./build-charset.js";
import { EncodeVlw } from "./encode-vlw.js";
import { ComputeAscentDescent, hex } from "./utils.js";

export interface ConvertResult {
	/** Path of the generated .vlw file */
	vlwPath: string;
	/** Font size (px) the glyphs were rasterized at */
	size: number;
	/** Distance from the baseline to the top of the tallest glyph */
	ascent: number;
	/** Distance from the baseline to the bottom of the lowest-hanging glyph */
	descent: number;
	/** Horizontal advance of the space character, used since it has no bitmap */
	spaceAdvance: number;
	/** Per-glyph metrics for every character that was rasterized */
	glyphs: VlwGlyph[];
}

function Convert(setConf: typeof config | null): ConvertResult {
	if (!setConf) setConf = config;
	const font = opentype.parse(
		fs.readFileSync(setConf.fontFile).buffer as ArrayBuffer,
	);
	const charset = BuildCharset();
	if (charset.length === 0)
		throw new Error("No Unicode range or specific codes have been defined!");

	console.log("=====================");
	console.log("Creating font file...");
	console.log(`Unicode blocks included     = ${setConf.unicodeBlocks.length}`);
	console.log(
		`Specific unicodes included  = ${setConf.specificUnicodes.length}`,
	);
	console.log(`Total characters requested  = ${charset.length}`);

	const size = setConf.fontSize;
	const glyphs: VlwGlyph[] = [];
	const missing: number[] = [];
	for (const c of charset) {
		const g = RenderGlyph(font, c, size);
		if (g) glyphs.push(g);
		else missing.push(c);
	}
	if (missing.length) {
		console.warn(
			`Font has no glyph for ${missing.length} code point(s), skipped: ` +
				missing
					.slice(0, 20)
					.map((c) => "0x" + hex(c))
					.join(" ") +
				(missing.length > 20 ? " ..." : ""),
		);
	}
	console.log(`Glyphs written              = ${glyphs.length}`);

	const { ascent, descent } = ComputeAscentDescent(font, size);
	// The space character (0x20) is excluded from the rasterized charset
	// (it has no visible bitmap), so its advance is measured separately.
	const spaceAdvance = RenderGlyph(font, 0x20, size)?.setWidth ?? Math.round(size / 3);
	const name = font.names.fullName?.en ?? setConf.outputName;
	const psname = font.names.postScriptName?.en ?? setConf.outputName;
	const vlw = EncodeVlw(glyphs, size, ascent, descent, name, psname);

	fs.mkdirSync(setConf.outputDir, { recursive: true });
	const base = setConf.outputName
	const vlwPath = path.join(setConf.outputDir, `${base}.vlw`);
	fs.writeFileSync(vlwPath, vlw);
	console.log(`Saved ${vlwPath} (${vlw.length} bytes)`);

	if (base.length + 5 > 31) {
		console.warn(
			`Note: "/${base}.vlw" exceeds the 31-character SPIFFS filename limit; rename it before uploading.`,
		);
	}
	if (base.includes("_"))
		console.warn("Note: SPIFFS does not accept underscores in filenames.");

	console.log("All done!");

	return { vlwPath, size, ascent, descent, spaceAdvance, glyphs };
}

export default Convert;