import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, Column, FontText } from "@geekmagic-react/elements.js";
import { config } from "dotenv";
import { useEffect, useState } from "react";
import { LoadFontsAsync } from "./font-store.js";

/**
 * A simple React component demonstrating custom font usage.
 * Note: Text wrapping is not supported yet!
 */
function ReactCustomFontExample() {
	const randomNumber = () =>
		Math.floor(Math.random() * 100)
			.toString()
			.padStart(2, "0");

	const [numbers, setNumbers] = useState([
		randomNumber(),
		randomNumber(),
		randomNumber(),
		randomNumber(),
	]);

	useEffect(() => {
		const timers = numbers.map((_, index) => {
			const update = () => {
				setNumbers((prev) => {
					const next = [...prev];
					next[index] = randomNumber();
					return next;
				});
				const delay = 250 + Math.random() * 170;
				timers[index] = setTimeout(update, delay);
			};
			const delay = 250 + Math.random() * 170;
			return setTimeout(update, delay);
		});

		return () => {
			timers.forEach(clearTimeout);
		};
	}, []);

	return (
		<Box tb="w-[240] h-[240] flex flex-row justify-center gap-[20] text-[#ff6464]">
			<Column spacing={20} align="center" justify="center">
				<FontText vlw="SankofaDisplay-Regular50">{numbers[0]}</FontText>
				<FontText vlw="SankofaDisplay-Regular50">{numbers[1]}</FontText>
			</Column>

			<Column spacing={20} align="center" justify="center">
				<FontText vlw="SankofaDisplay-Regular50">{numbers[2]}</FontText>
				<FontText vlw="SankofaDisplay-Regular50">{numbers[3]}</FontText>
			</Column>
		</Box>
	);
}

config();

const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

await LoadFontsAsync(renderer, ["SankofaDisplay-Regular50"]);
render(<ReactCustomFontExample />);
