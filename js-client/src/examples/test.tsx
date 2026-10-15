import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, ImageBox, TtfText } from "@geekmagic-react/elements.js";
import { cn } from "@geekmagic-react/tailbreeze.js";
import { config } from "dotenv";
import { useEffect, useState } from "react";

const pad = (value: number) => value.toString().padStart(2, "0");

function formatTime(date: Date) {
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date) {
	const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
	const month = date.toLocaleDateString("en-US", { month: "short" });
	return `${weekday}, ${month} ${date.getDate()}`.toUpperCase();
}

function TitleBar() {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	return (
		<Box tb="flex justify-between items-center p-[2] gap-[10] flex-row w-full">
			<ImageBox
				src={"example_assets/weather/cl-lght.png"}
				height={80}
				width={80}
				colorDepth={8}
			/>
			<Box tb="flex flex-col items-center">
				<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={50}>
					{formatTime(now)}
				</TtfText>
				<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={15}>
					{formatDate(now)}
				</TtfText>
			</Box>
		</Box>
	);
}

function ForecastItem(props: { icon: string; hour: string }) {
	return (
		<Box tb="flex items-center justify-center gap-[2] flex-col">
			<ImageBox src={props.icon} height={30} width={30} colorDepth={8} />
			<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={15}>
				{props.hour}
			</TtfText>
		</Box>
	);
}

function WeatherWidget() {
	return (
		<Box tb="flex w-full flex-row gap-[20] justify-center">
			<ForecastItem icon="example_assets/weather/cl-lght.png" hour="21" />
			<ForecastItem icon="example_assets/weather/cl-rain.png" hour="22" />
			<ForecastItem icon="example_assets/weather/cl-rain.png" hour="23" />
			<ForecastItem icon="example_assets/weather/cl-rain.png" hour="24" />
		</Box>
	);
}

function WeatherAttribute(props: { icon: string; hour: string }) {
	return (
		<Box tb="flex items-center justify-center gap-[2] flex-col">
			<ImageBox src={props.icon} height={20} width={20} colorDepth={8} />
			<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={15}>
				{props.hour}
			</TtfText>
		</Box>
	);
}

function WeatherAttributesRow() {
	return (
		<Box tb="flex w-full flex-row gap-[20] justify-center">
			<WeatherAttribute icon="example_assets/weather/drp.png" hour="45%" />
			<WeatherAttribute icon="example_assets/weather/sun.png" hour="High" />
			<WeatherAttribute icon="example_assets/weather/wnd.png" hour="6" />
			<WeatherAttribute icon="example_assets/weather/cmpss.png" hour="SW" />
		</Box>
	);
}

function Separator() {
	return <Box tb="h-[3] w-full bg-[#161616]" />;
}

function App() {
	return (
		<Box
			tb={cn(
				"flex flex-col items-start",
				"p-[15] w-full h-full gap-[8]",
				"bg-[#000] text-[#fff]",
			)}
		>
			<TitleBar />
			<Separator />
			<WeatherWidget />
			<Separator />
			<WeatherAttributesRow />
		</Box>
	);
}

config();
const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

// await renderer.WipeAssetsAsync();
render(<App />);
