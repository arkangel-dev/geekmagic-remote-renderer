const enum RenderParameterCodes {
	PARAM_X = 0x01,
	PARAM_Y = 0x02,
	PARAM_WIDTH = 0x03,
	PARAM_HEIGHT = 0x04,
	PARAM_THICKNESS = 0x05,
	PARAM_COLOR = 0x06,
	PARAM_FILL_COLOR = 0x07,
	PARAM_RADIUS = 0x08,
	PARAM_TEXT = 0x09,
	PARAM_FONT_SIZE = 0x0a,
	PARAM_CUSTOM_FONT = 0x0b,
	PARAM_TEXT_ALIGNMENT = 0x0c,
	PARAM_COLOR_DEPTH = 0x0d,
	PARAM_SPRITE_ID = 0x0e,
	PARAM_IMAGE_DATA = 0x0f,
	PARAM_FILENAME = 0x10,
	PARAM_DITHER_COLOR = 0x11,
	PARAM_DITHER_SIZE = 0x12,
	PARAM_PIN_ID = 0x013,
}

const enum RenderingOperationCodes {
	OP_FILL_RECT = 0x01,
	OP_DRAW_RECT = 0x02,
	OP_DRAW_CIRCLE = 0x03,
	OP_FILL_CIRCLE = 0x04,
	OP_DRAW_TEXT = 0x05,
	OP_DRAW_FONT_TEXT = 0x06,
	OP_CREATE_SPRITE = 0x07,
	OP_ENTER_SPRITE = 0x08,
	OP_EXIT_SPRITE = 0x09,
	OP_DELETE_SPRITE = 0x0a,
	OP_DRAW_SPRITE = 0x0b,
	OP_FILL_DITHER_RECT = 0x0c,
	OP_DRAW_LFS_BITMAP = 0x0d,
	OP_REGISTER_GPIO_CALLBACK = 0x0e,
	OP_CLEAR_GPIO_CALLBACK = 0x0f,
	OP_DRAW_LFS_RGB565 = 0x10,
}

const enum AuxParameterCodes {
	PARAM_PIN_ID = 0x01,
	PARAM_PIN_STATE = 0x02,
}

const enum AuxOperationCodes {
	OP_PIN_STATE_CHANGE = 0x01,
}

const enum TextPositionDatum {
	TL_DATUM = 0,
	TC_DATUM = 1,
	TR_DATUM = 2,
	ML_DATUM = 3,
	CL_DATUM = 3,
	MC_DATUM = 4,
	CC_DATUM = 4,
	MR_DATUM = 5,
	CR_DATUM = 5,
	BL_DATUM = 6,
	BC_DATUM = 7,
	BR_DATUM = 8,
	L_BASELINE = 9,
	C_BASELINE = 10,
	R_BASELINE = 11,
}

const MaxTotalAssetSize = 170000;

export {
	RenderParameterCodes as ParameterCodes,
	RenderingOperationCodes as OperationCodes,
	TextPositionDatum,
	MaxTotalAssetSize,
	AuxParameterCodes,
	AuxOperationCodes,
};
