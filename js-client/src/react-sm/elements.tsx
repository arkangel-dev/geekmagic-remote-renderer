import type {
	BoxProps,
	ColumnElementProps,
	DitherBoxProps,
	FontTextProps,
	RowElementProps,
	TextProps,
} from "./node-interfaces.js";

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
