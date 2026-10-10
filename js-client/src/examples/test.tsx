import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, VlwText, Text, TtfText } from "@geekmagic-react/elements.js";
import { useIsAssetLoading, useUploadAsset } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";

function App() {
	const isLoading = useIsAssetLoading();
	if (isLoading) return <></>;

	return (
		<Box tb="p-[20] flex items-center justify-center h-full">
			<TtfText
				fontPath={"example_assets/raw_fonts/Final-Frontier.ttf"}
				fontSize={50}
				tb="text-[#ff0]"
			>
				Hi there!
			</TtfText>

			<TtfText
				fontPath={"example_assets/raw_fonts/Jaro.ttf"}
				fontSize={40}
				tb="text-[#0f2]"
			>
				Hi there!
			</TtfText>
		</Box>
	);
}

config();

const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

// renderer.WipeAssetsAsync().then(() => {
// 	console.log("Assets wiped successfully.");

// });

render(<App />);
