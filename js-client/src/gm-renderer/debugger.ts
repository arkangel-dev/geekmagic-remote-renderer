export function DebugPayload(payload: Buffer) {
	const data = new Uint8Array(payload);
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

	console.log(
		`Payload: ${Array.from(data)
			.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
			.join(" ")}`,
	);

	if (data.length < 5) {
		console.error("Invalid payload: too short");
		return;
	}

	if (data[0] !== 0x47 || data[1] !== 0x4d || data[2] !== 0x50) {
		console.error("Invalid payload: missing GMP header");
		return;
	}

	let offset = 3;

	const operationCount = view.getUint16(offset, true);
	offset += 2;

	console.log(`GMP packet: ${data.length} bytes`);
	console.log(`Operations: ${operationCount}`);

	for (let operation = 0; operation < operationCount; operation++) {
		if (offset + 2 > data.length) {
			console.error(`Operation ${operation}: truncated`);
			return;
		}

		const opCode = data[offset++];
		const parameterCount = data[offset++];

		if (!opCode || !parameterCount) {
			console.error(
				`Operation ${operation}: invalid opcode or parameter count`,
			);
			return;
		}

		console.log(`Operation ${operation}:`);
		console.log(
			`  Opcode: 0x${opCode.toString(16).padStart(2, "0").toUpperCase()}`,
		);
		console.log(`  Parameters: ${parameterCount}`);

		for (let parameter = 0; parameter < parameterCount; parameter++) {
			if (offset + 3 > data.length) {
				console.error(`    Parameter ${parameter}: truncated`);
				return;
			}

			const paramType = data[offset++];
			if (!paramType) {
				console.error(`    Parameter ${parameter}: invalid parameter type`);
				return;
			}
			const valueLength = view.getUint16(offset, true);
			offset += 2;

			if (offset + valueLength > data.length) {
				console.error(`    Parameter ${parameter}: truncated value`);
				return;
			}

			const value = data.slice(offset, offset + valueLength);
			offset += valueLength;

			console.log(`    Parameter ${parameter}:`);
			console.log(
				`      Type: 0x${paramType.toString(16).padStart(2, "0").toUpperCase()}`,
			);
			console.log(`      Length: ${valueLength}`);
			console.log(
				`      Value: ${Array.from(value)
					.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
					.join(" ")}`,
			);
		}
	}

	if (offset !== data.length) {
		console.warn(`Trailing data: ${data.length - offset} bytes`);
	}
}
