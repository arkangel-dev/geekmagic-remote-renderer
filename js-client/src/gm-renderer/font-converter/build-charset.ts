import { config } from "./default-config.js";
import { hex } from "./utils.js";

export function BuildCharset(): number[] {
	const codes: number[] = [];
	for (const [first, last] of config.unicodeBlocks) {
		if (last < first) {
			throw new Error(
				`Bad Unicode range, last < first: 0x${hex(first)} - 0x${hex(last)}`,
			);
		}
		for (let c = first; c <= last; c++) codes.push(c);
	}
	codes.push(...config.specificUnicodes);

	// TFT_eSPI only handles 16-bit code points; 0-32 are control codes and space
	const valid = codes.filter(
		(c) => c > 0x20 && c <= 0xffff && (c < 0xd800 || c > 0xdfff),
	);
	if (valid.length !== codes.length)
		console.warn(
			`Skipped ${codes.length - valid.length} code point(s) outside 0x21-0xFFFF or in the surrogate range.`,
		);

	// Remove duplicates and sort, as Processing's PFont keeps glyphs ordered
	return [...new Set(valid)].sort((a, b) => a - b);
}
