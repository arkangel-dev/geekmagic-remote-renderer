import { RenderGlyph } from "./render-glyph.js";

/**
 * Same rule as Processing
 * ascent from 'd', descent from 'p', else font metrics.
 */
export function ComputeAscentDescent(
	font: opentype.Font,
	size: number,
): { ascent: number; descent: number } {
	const scale = size / font.unitsPerEm;
	const d = RenderGlyph(font, 0x64, size);
	const p = RenderGlyph(font, 0x70, size);
	const ascent =
		d && d.height > 0 ? d.topExtent : Math.round(font.ascender * scale);
	const descent =
		p && p.height > 0
			? p.height - p.topExtent
			: Math.round(-font.descender * scale);
	return { ascent, descent };
}
/**
 * Java DataOutputStream.writeUTF
 * 2-byte big-endian length, then UTF-8 bytes.
 */
export function JavaUTF(s: string): Buffer {
	const bytes = Buffer.from(s, "utf8");
	const len = Buffer.alloc(2);
	len.writeUInt16BE(bytes.length);
	return Buffer.concat([len, bytes]);
}

export function hex(n: number, digits = 4): string {
	return n.toString(16).toUpperCase().padStart(digits, "0");
}
