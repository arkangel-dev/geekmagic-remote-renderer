import { useEffect, useState } from "react";
import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, Column, DitherBox, Text } from "@geekmagic-react/elements.js";
import { cn } from "@geekmagic-react/tailbreeze.js";
import { config } from "dotenv";

function ReactCustomFontExample() {
	return (
		<Box tb="w-[240] h-[240] flex flex-row justify-center p-[10]">
			<Box tb="border-[#d93838] p-[13] pt-[20] flex-[1] justify-between">
				<Box
					tb={cn(
						"absolute top-[-7] left-[10]",
						"bg-[#000] px-[20] flex items-center justify-center",
					)}
				>
					<Text tb="text-[#d93838]">Latest Pipeline - #1239</Text>
				</Box>

				<Box tb="text-[#cbcbcb]">
					<Column spacing={5}>
						<Text>1m 37s</Text>
						<Text>arkangel-dev</Text>
						<Text>acdef73cf</Text>
						<Text>81-geekmagic-react</Text>
					</Column>

					<Text tb="text-wrap mt-[20]">
						This is a sample GitLab pipeline status display using GeekMagic React components.
					</Text>
				</Box>

				<ProgressBar />
			</Box>
		</Box>
	);
}

function ProgressBar() {
	const [value, setValue] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setValue((value) => {
				if (value >= 100) {
					return 0;
				}

				return value + 10;
			});
		}, 400);

		return () => clearInterval(interval);
	}, []);

	return (
		<Box tb="h-[20] w-full border-[#cbcbcb] p-[5]">
			<DitherBox ditherSize={3} tb={`h-full w-[${value}%] bg-[#cbcbcb] `} />
		</Box>
	);
}

config();
const [_, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

render(<ReactCustomFontExample />);
