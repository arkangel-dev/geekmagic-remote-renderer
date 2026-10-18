import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, FrameAnimation, Text } from "@geekmagic-react/elements.js";
import { useButton } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";
import { useState } from "react";

function App() {
	return (
		<Box tb={"flex items-center justify-center h-full"}>
			<FrameAnimation
				src={"./example_assets/zombie_frames"}
				height={150}
				width={150}
			/>
		</Box>
	);
}

config();
const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

render(<App />);
