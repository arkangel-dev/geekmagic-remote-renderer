import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, ImageBox } from "@geekmagic-react/elements.js";
import { config } from "dotenv";

// TODO: I still need to make sure that
// yoga is informed about the dimensions
// of the image box... Imma do that tomorow
function App() {
	return (
		<Box tb={"p-[20] flex items-center justify-center h-full"}>
			<ImageBox
				src={"example_assets/cat.jpg"}
				height={240}
				width={240}
				colorDepth={1}
			/> 
		</Box>
	);
}

config();
const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

await renderer.WipeAssetsAsync();
render(<App />);
