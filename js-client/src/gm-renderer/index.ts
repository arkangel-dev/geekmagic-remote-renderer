import { OperationCodes, ParameterCodes } from "./consts.js";
import WebSocket from "ws";
import { DebugPayload } from "./debugger.js";
import type {
	FillCircleData,
	RectData,
	FillRectData,
	CircleData,
	TextData,
	FontTextData,
	SpriteBase,
	EditSpriteData,
	DrawSpriteData,
	CreateSpriteData,
	DrawBitmapData,
	DrawDitherRectData,
} from "./types.js";
import { existsSync, readFile, readFileSync } from "node:fs";

interface GeekMagicRendererOptions {
	management_url?: string;
}
interface GeekMagicFile {
	name: string;
	size: number;
}

export interface FontBlitSetting {
	vlwName: string;
	baseBlitSize: {
		width: number;
		height: number;
		top?: number;
		left?: number;
	};
	spaceWidth?: number;
	specialBlitSize: Record<
		string,
		{
			width: number;
			height: number;
		}
	>;
}

export class GeekMagicRenderer {
	private operation_buffer: Buffer[] = [];
	private websocket: WebSocket | null = null;
	private management_url: string | undefined;
	FontBlitSettings: FontBlitSetting[] = [];

	constructor(options?: GeekMagicRendererOptions) {
		this.management_url = options?.management_url;
	}

	GetFontBlitSetting(vlwName: string): FontBlitSetting {
		var blitSetting = this.FontBlitSettings.find(
			(setting) => setting.vlwName === vlwName,
		)!;
		if (blitSetting) return blitSetting;
		// export const CHAR_WIDTH = 7;
		// export const LINE_HEIGHT = 13;

		return {
			baseBlitSize: {
				width: 7,
				height: 13,
			},
			vlwName: "undefined",
			specialBlitSize: {},
		} as FontBlitSetting;
	}

	/**
	 * Draws a filled rectangle on the canvas with the specified position,
	 * dimensions, and color.
	 */
	FillRect(props: FillRectData): GeekMagicRenderer {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_FILL_RECT, 6]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramU16(ParameterCodes.PARAM_WIDTH, props.width),
				this.paramU16(ParameterCodes.PARAM_HEIGHT, props.height),
				this.paramU16(ParameterCodes.PARAM_RADIUS, props.borderRadius ?? 0),
				this.paramU16(
					ParameterCodes.PARAM_FILL_COLOR,
					this.rgb565(props.color),
				),
			]),
		);
		return this;
	}

	FillDitherRect(props: DrawDitherRectData): GeekMagicRenderer {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_FILL_DITHER_RECT, 7]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramU16(ParameterCodes.PARAM_WIDTH, props.width),
				this.paramU16(ParameterCodes.PARAM_HEIGHT, props.height),
				this.paramU16(ParameterCodes.DITHER_COLOR, this.rgb565(props.ditherColor)),
				this.paramU16(ParameterCodes.DITHER_SIZE, props.ditherSize),
				this.paramU16(
					ParameterCodes.PARAM_FILL_COLOR,
					this.rgb565(props.color),
				),
			]),
		);
		return this;
	}

	/**
	 * Draws a rectangle on the canvas with the specified position, dimensions,
	 */
	Rect(props: RectData) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_DRAW_RECT, 7]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramU16(ParameterCodes.PARAM_WIDTH, props.width),
				this.paramU16(ParameterCodes.PARAM_HEIGHT, props.height),
				this.paramU16(ParameterCodes.PARAM_COLOR, this.rgb565(props.color)),
				this.paramU16(ParameterCodes.PARAM_THICKNESS, props.thickness),
				this.paramU16(ParameterCodes.PARAM_RADIUS, props.borderRadius ?? 0),
			]),
		);
		return this;
	}

	/**
	 * Draws a filled circle on the canvas with the specified position, radius,
	 * and color
	 */
	FillCircle(props: FillCircleData) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_FILL_CIRCLE, 4]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramU16(ParameterCodes.PARAM_RADIUS, props.radius),
				this.paramU16(
					ParameterCodes.PARAM_FILL_COLOR,
					this.rgb565(props.color),
				),
			]),
		);
		return this;
	}

	/**
	 * Draws a circle on the canvas with the specified position, radius, color,
	 * and thickness
	 */
	Circle(props: CircleData) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_DRAW_CIRCLE, 5]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramU16(ParameterCodes.PARAM_RADIUS, props.radius),
				this.paramU16(ParameterCodes.PARAM_THICKNESS, props.thickness),
				this.paramU16(ParameterCodes.PARAM_COLOR, this.rgb565(props.color)),
			]),
		);
		return this;
	}

	/**
	 * Draws text on the canvas with the specified position, font size, color,
	 * uses the built-in font. For custom fonts, use the `FontText` method instead.
	 */
	Text(props: TextData) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_DRAW_TEXT, 5]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramU16(ParameterCodes.PARAM_FONT_SIZE, props.fontSize),
				this.paramText(ParameterCodes.PARAM_TEXT, props.text),
				this.paramU16(ParameterCodes.PARAM_COLOR, this.rgb565(props.color)),
			]),
		);
		return this;
	}

	/**
	 * Draws text on the canvas with the specified position, font name, color,
	 * and optional text alignment. This method allows the use of custom fonts.
	 * If you want to use the built-in font, use the `Text` method instead.
	 */
	FontText(props: FontTextData) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_DRAW_FONT_TEXT, 6]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramText(ParameterCodes.PARAM_CUSTOM_FONT, props.fontName),
				this.paramText(ParameterCodes.PARAM_TEXT, props.text),
				this.paramU16(
					ParameterCodes.PARAM_TEXT_ALIGNMENT,
					props.textAlign ?? 0,
				),
				this.paramU16(ParameterCodes.PARAM_COLOR, this.rgb565(props.color)),
			]),
		);
		return this;
	}

	/**
	 * Create a sprite with the specified ID, width, height, and optional color depth.
	 */
	CreateSprite(props: CreateSpriteData) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_CREATE_SPRITE, 4]),
				this.paramU16(ParameterCodes.PARAM_SPRITE_ID, props.id),
				this.paramU16(ParameterCodes.PARAM_WIDTH, props.width),
				this.paramU16(ParameterCodes.PARAM_HEIGHT, props.height),
				this.paramU16(ParameterCodes.PARAM_COLOR_DEPTH, props.colorDepth ?? 16),
			]),
		);
		return this;
	}

	EnterSprite(props: SpriteBase) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_ENTER_SPRITE, 1]),
				this.paramU16(ParameterCodes.PARAM_SPRITE_ID, props.id),
			]),
		);
	}

	ExitSprite() {
		this.operation_buffer.push(
			Buffer.concat([Buffer.from([OperationCodes.OP_EXIT_SPRITE, 0])]),
		);
	}

	/**
	 * Enters a sprite editing mode for the specified sprite ID, then runs
	 * callback function to edit the sprite and then exists the sprite editing mode
	 */
	EditSprite(props: EditSpriteData) {
		this.EnterSprite({ id: props.id });
		props.editOps(this);
		this.ExitSprite();

		return this;
	}

	/**
	 * Deletes a sprite with the specified ID from the canvas. Try to delete
	 * a sprite that is not being used to minimize memory usage
	 */
	DeleteSprite(props: SpriteBase) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_DELETE_SPRITE, 1]),
				this.paramU16(ParameterCodes.PARAM_SPRITE_ID, props.id),
			]),
		);
		return this;
	}

	/**
	 * Draws a sprite on the canvas at the specified position using the sprite's ID.
	 */
	DrawSprite(props: DrawSpriteData) {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_DRAW_SPRITE, 3]),
				this.paramU16(ParameterCodes.PARAM_SPRITE_ID, props.id),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
			]),
		);
		return this;
	}

	DrawBitmap(props: DrawBitmapData): GeekMagicRenderer {
		this.operation_buffer.push(
			Buffer.concat([
				Buffer.from([OperationCodes.OP_DRAW_LFS_BITMAP, 5]),
				this.paramU16(ParameterCodes.PARAM_X, props.x),
				this.paramU16(ParameterCodes.PARAM_Y, props.y),
				this.paramU16(ParameterCodes.PARAM_WIDTH, props.width),
				this.paramU16(ParameterCodes.PARAM_HEIGHT, props.height),
				this.paramText(ParameterCodes.PARAM_FILENAME, props.file),
			]),
		);

		return this;
	}

	/**
	 * Closes the WebSocket connection if it is open.
	 * @returns A promise that resolves when the connection is closed.
	 */
	async CloseConnectionAsync(): Promise<void> {
		if (this.websocket) {
			await new Promise<void>((resolve, reject) => {
				this.websocket!.onclose = () => {
					console.log("WebSocket connection closed");
					resolve();
				};
				this.websocket!.close();
			});
			this.websocket = null;
		}
	}

	/**
	 * Establishes a WebSocket connection to the specified address and port.
	 * @param address The IP address or hostname of the GeekMagic server.
	 * @param port The port number of the GeekMagic server.
	 * @returns A promise that resolves to the GeekMagicRenderer instance when the connection is established.
	 */
	async ConnectAsync(
		address: string,
		port: number,
	): Promise<GeekMagicRenderer> {
		this.websocket = new WebSocket(`ws://${address}:${port}`);
		this.websocket.onmessage = (event) => {
			// console.log("Received message from server:", event.data);
		};

		await new Promise<void>((resolve, reject) => {
			this.websocket!.onopen = () => {
				console.log("Connected to GeekMagic server");
				resolve();
			};
			this.websocket!.onerror = (error) => reject(error);
		});

		return this;
	}

	/**
	 * Sends the current payload to the connected WebSocket server.
	 * @throws Error if the WebSocket is not connected or not open.
	 */
	Send() {
		if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN)
			throw new Error("WebSocket is not connected or not open");
		const payload = this.buildPayload();
		this.websocket.send(payload);
		this.operation_buffer = [];
		return this;
	}

	/**
	 * Debugs the current payload by printing it to the console.
	 */
	DebugView() {
		const payload = this.buildPayload();
		console.log("Debugging payload:");
		DebugPayload(payload);
		return this;
	}

	/**
	 * Wipes all assets from the GeekMagic server.
	 */
	async WipeAssetsAsync() {
		if (!this.management_url) throw new Error("Management URL is not set");
		await fetch(this.management_url + "/api/files", {
			method: "DELETE",
			redirect: "follow",
		});
	}

	async ListAssetsAsync(): Promise<GeekMagicFile[]> {
		if (!this.management_url) throw new Error("Management URL is not set");
		const response = await fetch(this.management_url + "/api/files", {
			method: "GET",
			redirect: "follow",
		});
		return response.json();
	}

	/**
	 * Uploads an asset to the GeekMagic server asynchronously.
	 * @param filePath File name
	 */
	async UploadAssetAsync(filePath: string) {
		if (!this.management_url) throw new Error("Management URL is not set");
		if (!filePath) throw new Error("File path is not specified");
		if (!existsSync(filePath)) throw new Error("File does not exist");
		const formdata = new FormData();
		formdata.append("file", new Blob([readFileSync(filePath)]), filePath);
		await fetch(this.management_url + "/api/files", {
			method: "POST",
			body: formdata,
			redirect: "follow",
		});
	}

	private buildPayload(): Buffer {
		return Buffer.concat([
			Buffer.from("GMP", "ascii"),
			this.u16(this.operation_buffer.length),
			Buffer.concat(this.operation_buffer),
		]);
	}

	private u16(value: number): Buffer {
		return Buffer.from([value & 0xff, (value >> 8) & 0xff]);
	}

	private paramU16(paramType: number, value: number): Buffer {
		return Buffer.concat([
			Buffer.from([paramType]),
			this.u16(2),
			this.u16(value),
		]);
	}

	private paramText(paramType: number, text: string): Buffer {
		const value = Buffer.from(text, "ascii");
		if (value.length > 65535) throw new Error("Text cannot exceed 65535 bytes");

		return Buffer.concat([
			Buffer.from([paramType]),
			this.u16(value.length),
			value,
		]);
	}

	private paramBytes(paramType: number, value: Uint8Array): Buffer {
		const bytes = Buffer.from(value);
		if (bytes.length > 65535)
			throw new Error(
				`Parameter data cannot exceed 65535 bytes: Actual: ${bytes.length}`,
			);

		return Buffer.concat([
			Buffer.from([paramType]),
			this.u16(bytes.length),
			bytes,
		]);
	}

	/**
	 * Converts a hex color string to RGB565 format.
	 * @param color - The hex color string (e.g., "#RRGGBB" or "#RGB").
	 * @returns The color in RGB565 format as a number.
	 */
	private rgb565(color: string): number {
		if (color.length < 3) throw new Error(`Invalid RGB color: ${color}`);

		if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
			const r = parseInt(color.slice(1, 2).repeat(2), 16);
			const g = parseInt(color.slice(2, 3).repeat(2), 16);
			const b = parseInt(color.slice(3, 4).repeat(2), 16);
			return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
		}

		if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
			const r = parseInt(color.slice(1, 3), 16);
			const g = parseInt(color.slice(3, 5), 16);
			const b = parseInt(color.slice(5, 7), 16);
			return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
		}

		throw new Error(`Invalid RGB color: ${color}`);
	}
}
