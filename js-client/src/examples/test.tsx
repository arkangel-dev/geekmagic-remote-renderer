import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, FontText, Text } from "@geekmagic-react/elements.js";
import { useUploadAsset } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";

function App() {
	const assetUploadTask = useUploadAsset({
		path: "example_assets/SankofaDisplay-Regular50.vlw",
	});

	if (!assetUploadTask.uploaded) {
		return (
			<Box tb="p-[20] flex items-center justify-center h-full">
				<Text>Loading assets...</Text>
			</Box>
		);
	}

	return (
		<Box tb="p-[20] flex items-center justify-center h-full">
			<FontText vlw={"SankofaDisplay-Regular50"}>Hello World!</FontText>
		</Box>
	);
}

config();

const [_, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

render(<App />);
