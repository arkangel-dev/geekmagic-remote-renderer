export const config = {
	// Path to the .ttf / .otf file
	fontFile: "example_assets/raw_fonts/SankofaDisplay-Regular.ttf",

	// Base name for output files. SPIFFS max filename is 31 chars including the
	// leading "/", point size and ".vlw", and SPIFFS does NOT accept underscores.
	outputName: "SankofaDisplayRegular",

	outputDir: ".asset_cache",

	// Font size in pixels (Processing treats "points" as pixels)
	fontSize: 30,

	// Write a PNG showing the rendered glyphs (replaces the sketch's preview window)
	createPreview: true,

	// Inclusive [first, last] ranges, e.g. from https://en.wikipedia.org/wiki/Unicode_block
	unicodeBlocks: [
		[0x0021, 0x007e], // Basic Latin
		// [0x0030, 0x0039], // Example custom range (numbers 0-9)
	] as [number, number][],

	// Individual code points appended after the ranges
	specificUnicodes: [
		// 0x00a3, 0x00b0, 0x00b5, 0x03a9, 0x20ac, // £ ° µ Ω €
	] as number[],


};
