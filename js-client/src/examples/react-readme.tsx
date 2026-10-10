import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, Text, TtfText } from "@geekmagic-react/elements.js";
import { config } from "dotenv";
import { useEffect, useState } from "react";

function App() {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => {
			setSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	return (
		<Box tb="p-[20] flex items-center justify-center h-full gap-[5]">
			<TtfText
				fontPath={"example_assets/raw_fonts/MartianMono.ttf"}
				fontSize={20}
			>
				Hello World
			</TtfText>
			<Text>I've been up for {seconds} seconds now</Text>
		</Box>
	);
}

config();

const [_, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

render(<App />);
