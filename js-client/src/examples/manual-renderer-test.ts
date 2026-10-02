import { GeekMagicRenderer } from "@geekmagic-websocket/index.js";
import { config } from "dotenv";

async function main() {

	config()
	const displayAddress = process.env.DISPLAY_ADDRESS as string;

	const renderer = new GeekMagicRenderer({
		management_url: `http://${displayAddress}`,
	});
	// Upload assets to the GeekMagic server before connecting
	// Im doing it this way because I want the rendering to be an non async
	// operation so I can hook it up to a custom react renderer
	// await renderer.WipeAssetsAsync();
	const assets_response = await renderer.ListAssetsAsync();
	const assets = assets_response.map((x) => x.name);
	if (!assets.includes("tag-1.jpg"))
		await renderer.UploadAssetAsync("example_assets/tag-1.jpg");
	if (!assets.includes("tag-2.jpg"))
		await renderer.UploadAssetAsync("example_assets/tag-2.jpg");
	if (!assets.includes("tag-3.jpg"))
		await renderer.UploadAssetAsync("example_assets/tag-3.jpg");
	if (!assets.includes("SankofaDisplay-Regular50.vlw"))
		await renderer.UploadAssetAsync(
			"example_assets/SankofaDisplay-Regular50.vlw",
		);

	// Connect to the websocket
	await renderer.ConnectAsync(displayAddress, 81);

	// Start the rendering operations!
	renderer
		.FillRect({ x: 0, y: 0, width: 240, height: 240, color: "#000000" })
		.FillRect({
			x: 0,
			y: 0,
			width: 120,
			height: 120,
			color: "#030303",
			borderRadius: 20,
		})
		.Rect({
			x: 15,
			y: 15,
			width: 100,
			height: 100,
			color: "#000a11",
			thickness: 4,
			borderRadius: 15,
		})
		.FillCircle({ x: 120, y: 120, radius: 60, color: "#000001" })
		.Circle({ x: 120, y: 120, radius: 50, thickness: 5, color: "#000a11" })
		.Text({
			x: 60,
			y: 170,
			text: "This is GeekMagic!",
			fontSize: 1,
			color: "#3c3c3c",
		})
		.FontText({
			x: 40,
			y: 85,
			text: "Hello",
			fontName: "SankofaDisplay-Regular50",
			color: "#148a4b",
		});

	// Create a sprite and edit it...
	renderer.CreateSprite({ id: 1, width: 20, height: 20 }).EditSprite({
		id: 1,
		editOps: async (r) =>
			r
				.FillRect({
					x: 0,
					y: 0,
					width: 20,
					height: 20,
					color: "#007a3f",
					borderRadius: 5,
				})
				.Text({ x: 5, y: 3, text: "+", fontSize: 2, color: "#000000" }),
	});

	// Then you can draw the sprite on the screen
	// multiple times!
	renderer
		.DrawSprite({ id: 1, x: 180, y: 20 })
		.DrawSprite({ id: 1, x: 200, y: 40 })
		.DrawSprite({ id: 1, x: 200, y: 180 })
		.DrawSprite({ id: 1, x: 40, y: 200 })
		.DeleteSprite({ id: 1 });

	// Draw images
	// These images are loaded from LittleFS
	// (The ones that we uploaded earlier)
	renderer.DrawBitmap({
		file: "tag-1.jpg",
		x: 200,
		y: 200,
		width: 20,
		height: 20,
	});
	renderer.DrawBitmap({
		file: "tag-2.jpg",
		x: 200,
		y: 20,
		width: 20,
		height: 20,
	});
	renderer.DrawBitmap({
		file: "tag-3.jpg",
		x: 20,
		y: 200,
		width: 20,
		height: 20,
	});

	// Maybe view the payload before sending it off?
	// Useful for debugging
	// console.log(renderer.DebugView());

	// Then send it off!
	renderer.Send();
	console.log("Done...");
	await renderer.CloseConnectionAsync();
}

main().catch((err) => {
	console.error(err);
});
