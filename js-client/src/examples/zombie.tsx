import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, FrameAnimation, TtfText } from "@geekmagic-react/elements.js";
import { useButton } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";
import { useState } from "react";

function App() {
	const [isRunning, setIsRunning] = useState(false);

	// 10 refers to GPIO pin 10, not
	// the 10th pin on the ESP12F board
	useButton({
		pin: 10,
		onPress: () => {
            console.log("Button pressed");
            setIsRunning((prev) => !prev)
        },
        onLongPress: () => {
            console.log("Button long pressed");
            setIsRunning(false);
        }
	});

	return (
		<Box tb={"p-[20] flex items-center justify-center h-full"}>
			{isRunning && (
				<FrameAnimation
					src={"./example_assets/zombie_frames"}
					height={30}
					width={30}
				/>
			)}
		</Box>
	);
}

config();
const [_, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

render(<App />);
