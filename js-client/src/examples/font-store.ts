import type { GeekMagicRenderer } from "@geekmagic-websocket/index.js";

interface LoadOptions {
	renderer: GeekMagicRenderer;
	fontFiles: string[];
}

// Here we are configuring the custom font. We need to specify
// the footprint of the custom font on the display so that it can
// be blitted correctly.
// Note: Because of this only monospaced fonts are supported
const fontStore: Record<string, (o: LoadOptions) => Promise<void>> = {
	"MartianMono-Regular20": async (o: LoadOptions) => {
		o.fontFiles.push("example_assets/MartianMono-Regular20.vlw");
		o.renderer.FontBlitSettings.push({
			vlwName: "MartianMono-Regular20",
			baseBlitSize: {
				width: 15,
				height: 23,
				top: -1,
				left: -1,
			},
			spaceWidth: 5,
			specialBlitSize: {},
		});
	},

	"MartianMono-Regular25": async (o: LoadOptions) => {
		o.fontFiles.push("example_assets/MartianMono-Regular25.vlw");
		o.renderer.FontBlitSettings.push({
			vlwName: "MartianMono-Regular25",
			baseBlitSize: {
				width: 19,
				height: 26,
				top: -1,
				left: -1,
			},
			spaceWidth: 5,
			specialBlitSize: {},
		});
	},

	"JetBrainsMono-Regular50": async (o: LoadOptions) => {
		o.fontFiles.push("example_assets/JetBrainsMono-Regular50.vlw");
		o.renderer.FontBlitSettings.push({
			vlwName: "JetBrainsMono-Regular50",
			baseBlitSize: {
				width: 28,
				height: 44,
				top: -1,
				left: -1,
			},
			spaceWidth: 10,
			specialBlitSize: {},
		});
	},

	"SankofaDisplay-Regular50": async (o: LoadOptions) => {
		o.fontFiles.push("example_assets/SankofaDisplay-Regular50.vlw");
		o.renderer.FontBlitSettings.push({
			vlwName: "SankofaDisplay-Regular50",
			baseBlitSize: {
				width: 38,
				height: 66,
				top: -5,
				left: -2,
			},
			specialBlitSize: {},
		});
	},
};

export async function LoadFontsAsync(
	renderer: GeekMagicRenderer,
	fonts: string[],
) {
	const loadOptions: LoadOptions = {
		renderer,
		fontFiles: [],
	};
	for (const font of fonts) {
		const loader = fontStore[font];
		if (loader) await loader(loadOptions);
	}

	const existingAssetsResponse = await renderer.ListAssetsAsync();
	// If any of them are missing, Wipe the existing 
	// assets and upload the required font files.
	const existingAssetNames = existingAssetsResponse.map((x) => x.name);
	const missingFontFiles = loadOptions.fontFiles.filter(
		(assetPath) => !existingAssetNames.includes(assetPath.split("/").pop()!)
	);
	if (missingFontFiles.length > 0) {
		await renderer.WipeAssetsAsync();
		for (const assetPath of loadOptions.fontFiles) {
			process.stdout.write(`Uploading asset: ${assetPath}...`);
			await renderer.UploadAssetAsync(assetPath);
			process.stdout.write(` Done\n`);
		}
	}
}
