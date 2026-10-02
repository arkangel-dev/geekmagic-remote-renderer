import { useState, useEffect } from "react";
import { Box, Row, Text } from "@geekmagic-react/elements.js";
import { cn } from "@geekmagic-react/tailbreeze.js";
import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { config } from "dotenv";

const containerColor = "#d93838";

/**
 * A basic React application demonstrating state and effects.
 */
const App = function () {
	return (
		<Box
			tb={cn(
				"w-[240] h-[240] p-[10] gap-[15] flex-[1] justify-center",
				"content-center flex flex-col bg-[#000]",
			)}
		>
			<Box tb={cn("flex flex-row gap-[10] flex-[1]")}>
				<CounterComponent speed={100} />
				<CounterComponent />
			</Box>
			<LoremIpsum />
			<AtmosphereReading />
		</Box>
	);
};

/**
 * Simple container component with a label
 * and accepts children.
 */
const Container = (props: { children: React.ReactNode; title: string }) => {
	return (
		<Box
			tb={cn(
				`flex-[1] border-[${containerColor}] bg-[#000] px-[20]`,
				"justify-center gap-[5] relative",
			)}
		>
			<Box
				tb={cn(
					"absolute top-[-7] left-[10]",
					"bg-[#000] px-[5] flex items-center justify-center",
				)}
			>
				<Text tb={`text-[${containerColor}]`}>{props.title}</Text>
			</Box>
			{props.children}
		</Box>
	);
};

/**
 * A simple counter component that increments a value over time.
 * Most basic demonstration of react state and effects.
 */
const CounterComponent = function (props: { speed?: number }) {
	const [val, setVal] = useState(0);

	useEffect(() => {
		setInterval(() => {
			setVal((v) => v + 1);
		}, props.speed ?? 1000);
	}, []);
	return (
		<>
			<Container title="Counter">
				<Box
					tb={cn(
						"basis-[auto] shrink-[1] flex flex-row",
						"justify-center items-center gap-[10]",
					)}
				>
					<Text tb="text-[#fff]">{val}</Text>
				</Box>
			</Container>
		</>
	);
};

/**
 * Component to demonstrate how text wrapping works
 */
const LoremIpsum = function () {
	return (
		<Container title="RNG State">
			<Text tb="text-wrap">
				Lorem Ipsum is simply dummy text of the printing and typesetting
				industry. Lorem Ipsum has been the
			</Text>
		</Container>
	);
};

/**
 * Component to display simulated atmosphere readings (temperature, wind speed, humidity)
 */
const AtmosphereReading = function () {
	const [tempValue, setRandomNumber] = useState(Math.random());
	const [windValue, setRandomNumber2] = useState(Math.random());
	const [humidityValue, setRandomNumber3] = useState(Math.random());

	useEffect(() => {
		const interval = setInterval(() => {
			setRandomNumber(Math.random());
			setRandomNumber2(Math.random());
			setRandomNumber3(Math.random());
		}, 250);

		return () => clearInterval(interval);
	}, []);

	var tempColor = `text-[${tempValue > 0.5 ? "#62b62a" : "#b62a2a"}]`;
	var windColor = `text-[${windValue > 0.5 ? "#62b62a" : "#b62a2a"}]`;
	var humidityColor = `text-[${humidityValue > 0.5 ? "#62b62a" : "#b62a2a"}]`;

	return (
		<Container title="Atmosphere Reading">
			<Row>
				<Text tb="text-[#fff]">Temperature State :</Text>
				<Text tb={tempColor}>{tempValue > 0.5 ? "Ok" : "Not Ok"}</Text>
			</Row>

			<Row>
				<Text tb="text-[#fff]">Wind Speed State :</Text>
				<Text tb={windColor}>{windValue > 0.5 ? "Ok" : "Not Ok"}</Text>
			</Row>

			<Row>
				<Text tb="text-[#fff]">Humidity State :</Text>
				<Text tb={cn(humidityColor)}>
					{humidityValue > 0.5 ? "Ok" : "Not Ok"}
				</Text>
			</Row>
		</Container>
	);
};

config();
const [_, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});
render(<App />);
