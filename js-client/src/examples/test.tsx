import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, FontText, Text, TffFontText } from "@geekmagic-react/elements.js";
import { useIsAssetLoading, useUploadAsset } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";

function App() {
	const isLoading = useIsAssetLoading();
	if (isLoading) return <></>;

	return (
		<Box tb="p-[20] flex items-center justify-center h-full">
			<TffFontText
				fontPath={"example_assets/raw_fonts/Final-Frontier.ttf"}
				fontSize={50}
				tb="text-[#ff0]"
			>
				Hi there!
			</TffFontText>

			<TffFontText
				fontPath={"example_assets/raw_fonts/Jaro.ttf"}
				fontSize={40}
				tb="text-[#0f2]"
			>
				Hi there!
			</TffFontText>
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
