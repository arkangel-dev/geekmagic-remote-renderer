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

	renderer.RegisterPinStateChange({ pin: 10 });
    renderer.Send()
	console.log("Done...");


    while (true) {
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}
main();
