import type { AuxOperationCodes } from "./consts.js";

export interface ResponseDtoBase {
	messageType: AuxOperationCodes;
}

export interface PinStateChangeResponseDto extends ResponseDtoBase {
	pin: number;
	state: boolean;
}

export type ResponseDtoType = PinStateChangeResponseDto;
