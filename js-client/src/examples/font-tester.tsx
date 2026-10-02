import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, FontText } from "@geekmagic-react/elements.js";
import { config } from "dotenv";
import { useEffect, useMemo, useState } from "react";
import { LoadFontsAsync } from "./font-store.js";

// This is a font tester example. Define the font down here...
const targetFont = "MartianMono-Regular25";
const secondWord = "HI THERE";

// And then set the environment variable DEV_BLIT_MODE to true,
// This will display a shade of purple as the blit background, making it
// more visible. Once that's the case it will be easier to fine tune the
// Blit settings in the font-store.ts file
//
// Happy rendering!

function GenericExample() {
	const [randomWord, setRandomWord] = useState("FDGGG");
	const letterList = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const wordLength = 9;

	const fontColor = useMemo(() => {
		return process.env.DEV_BLIT_MODE === "true" ? "#000" : "#bb4d4d";
	}, [process.env.DEV_BLIT_MODE]);

	useEffect(() => {
		const interval = setInterval(() => {
			const randomWord = Array.from(
				{ length: wordLength },
				() => letterList[Math.floor(Math.random() * letterList.length)],
			).join("");
			setRandomWord(randomWord);
		}, 300);
		return () => clearInterval(interval);
	}, []);

	return (
		<Box tb="w-[240] h-[240] p-[5]">
			<Box tb="h-full w-full border-[#bb4d4d] items-center justify-center flex flex-col gap-[10]">
				<FontText tb={`text-[${fontColor}]`} vlw={targetFont}>
					{randomWord}
				</FontText>
				<FontText tb={`text-[${fontColor}]`} vlw={targetFont}>
					{secondWord}
				</FontText>
			</Box>
		</Box>
	);
}

config();

const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

await LoadFontsAsync(renderer, [targetFont]);
render(<GenericExample />);
