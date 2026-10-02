import type { TextPositionDatum } from "./consts.js";
import type { GeekMagicRenderer } from "./index.js";

export interface PositionData {
	x: number;
	y: number;
}

export interface SizeData {
	width: number;
	height: number;
}

export interface FillRectData extends PositionData, SizeData {
	color: string;
	borderRadius?: number;
}

export interface DrawDitherRectData extends PositionData, SizeData {
	ditherColor: string;
	ditherSize: number;
	color: string;
}

export interface RectData extends PositionData, SizeData {
	color: string;
	thickness: number;
	borderRadius?: number;
}

export interface FillCircleData extends PositionData {
	radius: number;
	color: string;
}

export interface CircleData extends FillCircleData {
	thickness: number;
}

export interface TextData extends PositionData {
	text: string;
	fontSize: number;
	color: string;
}

export interface FontTextData extends PositionData {
	text: string;
	fontName: string;
	color: string;
	textAlign?: TextPositionDatum;
}

export interface SpriteBase {
	id: number;
}

export interface CreateSpriteData extends SpriteBase {
	height: number;
	width: number;
	colorDepth?: number;
}

export interface EditSpriteData extends SpriteBase {
	editOps: (r: GeekMagicRenderer) => void;
}

export interface DrawSpriteData extends SpriteBase, PositionData {}

export interface DrawBitmapData extends PositionData, SizeData {
	file: string;
}
