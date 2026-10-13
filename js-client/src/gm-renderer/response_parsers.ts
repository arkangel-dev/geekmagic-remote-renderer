import { AuxOperationCodes, AuxParameterCodes } from "./consts.js";
import type {
	PinStateChangeResponseDto,
	ResponseDtoType,
} from "./response_dto.js";

export function parseResponse(data: Buffer): ResponseDtoType | null {
	if (
		data.length < 5 ||
		data[0] !== 0x47 ||
		data[1] !== 0x4d ||
		data[2] !== 0x50
	) // Check if the first 3 bytes is GMP
		return null;

	const messageType = data[3]!;
	const parameterCount = data[4]!;
	let offset = 5;
	const parameters = new Map<number, Buffer>();

	for (let i = 0; i < parameterCount; i++) {
		if (offset + 3 > data.length) return null;

		const parameterType = data[offset]!;
		const valueLength = data.readUInt16LE(offset + 1);
		offset += 3;

		if (offset + valueLength > data.length) return null;
		if (parameters.has(parameterType)) return null;
		parameters.set(parameterType, data.subarray(offset, offset + valueLength));
		offset += valueLength;
	}

	if (offset !== data.length) return null;

	switch (messageType) {
		case AuxOperationCodes.OP_PIN_STATE_CHANGE: {
			const pinData = parameters.get(AuxParameterCodes.PARAM_PIN_ID);
			const stateData = parameters.get(AuxParameterCodes.PARAM_PIN_STATE);
			if (
				parameters.size !== 2 ||
				pinData?.length !== 1 ||
				stateData?.length !== 1 ||
				stateData[0]! > 1
			)
				return null;

			const response: PinStateChangeResponseDto = {
				messageType: AuxOperationCodes.OP_PIN_STATE_CHANGE,
				pin: pinData[0]!,
				state: stateData[0] === 1,
			};
			return response;
		}
		default:
			return null;
	}
}
