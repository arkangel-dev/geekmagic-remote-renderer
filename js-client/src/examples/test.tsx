import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, TtfText } from "@geekmagic-react/elements.js";
import { usePinBinaryState, usePinLongPress } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";
import { useRef, useState } from "react";

function App() {
	const [count, setCount] = useState(0);

	usePinLongPress(() => setCount(0), 10);
	usePinBinaryState((state) => state && setCount((prev) => prev + 1), 10);

	return (
		<Box tb={"p-[20] flex items-center justify-center h-full"}>
			<TtfText
				fontPath={"./example_assets/raw_fonts/SankofaDisplay.ttf"}
				fontSize={80}
			>
				{count}
			</TtfText>
		</Box>
	);
}

config();
const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

render(<App />);
