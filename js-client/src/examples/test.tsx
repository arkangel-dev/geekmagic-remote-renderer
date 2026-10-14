import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, ImageBox } from "@geekmagic-react/elements.js";
import { config } from "dotenv";

function App() {
	return (
		<Box tb={"p-[20] flex items-center justify-center h-full"}>
			<ImageBox
				src={"example_assets/tag-2.jpg"}
				height={20}
				width={20}
				colorDepth={2}
			/>
		</Box>
	);
}

config();
const [_, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

render(<App />);
