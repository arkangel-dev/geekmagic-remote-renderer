import { useEffect, useState } from "react";
import type {
	BoxProps,
	ColumnElementProps,
	DitherBoxProps,
	FontTextProps,
	RowElementProps,
	TextProps,
	TffFontTextProps,
} from "./node-interfaces.js";
import { useRenderer } from "./hooks.js";
import { LoadFontsAsync } from "@geekmagic-websocket/font-manager.js";

export function Box(props: BoxProps) {
	return <baseBox {...props} />;
}

export function DitherBox(props: DitherBoxProps) {
	return <ditherBox {...props} />;
}

export function Text(props: TextProps) {
	return <baseText {...props} />;
}

export function FontText(props: FontTextProps) {
	return <fontText {...props} />;
}

export function TffFontText(props: TffFontTextProps) {
	const [isReady, setIsReady] = useState(false);

	const fontName = props.fontPath.split("/").pop()!.split(".")[0];
	const charRange = props.characterSetRange ?? [32, 126];
	const charRangeString = charRange.join("-");
	const vlwName = `${fontName}-${props.fontSize}-${charRangeString}`;
	const renderer = useRenderer();
	useEffect(() => {
		let cancelled = false;
		async function uploadFont() {
			await LoadFontsAsync(renderer, [
				{
					fontPath: props.fontPath,
					vlwName: vlwName,
					fontSize: props.fontSize,
					characterSetRange: charRange ?? [32, 126],
				},
			]);
			setIsReady(true);
		}
		void uploadFont();
		return () => {
			cancelled = true;
		};
	}, [props]);
	return isReady ? <fontText {...props} vlw={vlwName} /> : null;
}

export function Row(props: RowElementProps) {
	return (
		<baseBox
			style={{ gap: props.spacing ?? 0, display: "flex", flexDirection: "row" }}
			{...props}
		/>
	);
}

export function Column(props: ColumnElementProps) {
	return (
		<baseBox
			style={{
				gap: props.spacing ?? 0,
				display: "flex",
				flexDirection: "column",
				alignItems: props.align,
				justifyContent: props.justify,
			}}
			{...props}
		/>
	);
}
