import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, Text } from "@geekmagic-react/elements.js";
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
		<Box tb="p-[20] flex items-center justify-center w-[240] h-[240]">
			<Text>Hello World!</Text>
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