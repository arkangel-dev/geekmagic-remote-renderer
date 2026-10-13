import { GeekMagicRenderer } from "@geekmagic-websocket/index.js";
import { config } from "dotenv";

async function main() {
	config();

	const displayAddress = process.env.DISPLAY_ADDRESS as string;
	const renderer = new GeekMagicRenderer({
		management_url: `http://${displayAddress}`,
	});

	// Connect to the websocket
	await renderer.ConnectAsync(displayAddress, 81);

	renderer.RegisterPinStateChange({
		pin: 10,
		callback: (state) => console.log(`GPIO 10 state: ${state}`),
	});
	renderer.Send();
	console.log("Done...");
}
main();
