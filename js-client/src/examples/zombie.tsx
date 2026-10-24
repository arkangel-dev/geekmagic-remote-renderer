import CreateRenderer from "@geekmagic-react/create-renderer.js";
import {
	Box,
	Column,
	FrameAnimation,
	Row,
	Text,
	TtfText,
} from "@geekmagic-react/elements.js";
import { useButton, useIsAssetLoading } from "@geekmagic-react/hooks.js";
import { config } from "dotenv";
import { useEffect, useState } from "react";

function App() {
	const [time, setTime] = useState("12:30");
	const [date, setDate] = useState("Friday, Oct 10");

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			setTime(
				now.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				}),
			);
			setDate(
				now.toLocaleDateString([], {
					weekday: "long",
					month: "short",
					day: "numeric",
				}),
			);
		}, 1000);
		return () => clearInterval(interval);
	}, []);


	return (
		<Box tb={"flex items-center justify-center h-full gap-[10]"}>
			<FrameAnimation
				src={"./example_assets/zombie_frames"}
				height={31 * 4}
				width={25 * 4}
				frameRate={10}
			/>
			<Column align="center" justify="center">
				<TtfText
					fontPath={"./example_assets/raw_fonts/JollyLodger.ttf"}
					fontSize={60}
					tb={"text-[#F3D040]"}
				>
					{time}
				</TtfText>

				<TtfText
					fontPath={"./example_assets/raw_fonts/JollyLodger.ttf"}
					fontSize={30}
					tb={"text-[#2EA082]"}
				>
					{date}
				</TtfText>
			</Column>
		</Box>
	);
}

config();
const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});
await renderer.WipeAssetsAsync();

render(<App />);
