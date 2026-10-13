import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, TtfText } from "@geekmagic-react/elements.js";
import { usePinBinaryState } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";
import { useRef, useState } from "react";

function App() {
	const [count, setCount] = useState(0);

	const longPressDuration = 1000;
	const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

	usePinBinaryState((state) => {
		const pressed = !state;
		if (pressed) {
			setCount((prev) => prev + 1);
			longPressTimeout.current = setTimeout(() => {
				setCount(0);
				longPressTimeout.current = null;
			}, longPressDuration);
		} else if (longPressTimeout.current) {
			clearTimeout(longPressTimeout.current);
			longPressTimeout.current = null;
		}
	}, 10);

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
