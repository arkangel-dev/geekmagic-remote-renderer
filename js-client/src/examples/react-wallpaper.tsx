import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box } from "@geekmagic-react/elements.js";
import { config } from "dotenv";
import { useEffect, useMemo, useState } from "react";

function ValueToColorHex(value: number) {
	const g = 0;
	const r = value % 256;
	const b = 0;
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function Tile(props: { value: number; key?: any }) {
	const color = useMemo(() => ValueToColorHex(props.value), [props.value]);
	return <Box tb={`w-[8] h-[8] rounded-[2] bg-[${color}]`}></Box>;
}

function DecrementTileValue(value: number) {
	return Math.max(0, value - 10);
}

function Wallpaper() {
	const tileCount = 400;
	const [timeValues, setTimeValues] = useState(
		Array.from({ length: tileCount }, () => 0),
	);

	useEffect(() => {
		const interval = setInterval(() => {
			setTimeValues((prev) =>
				prev.map((v) => {
					const shouldChange = Math.random() < 0.05;
					if (!shouldChange) return DecrementTileValue(v);

					return Math.floor(Math.random() * 256);
				}),
			);
		}, 50);
		return () => clearInterval(interval);
	}, []);

	return (
		<Box tb={"flex items-center justify-center flex-wrap h-full gap-[4]"}>
			{timeValues.map((v, i) => {
				return <Tile value={v} key={i} />;
			})}
		</Box>
	);
}

config();
const [_, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});
render(<Wallpaper />);
