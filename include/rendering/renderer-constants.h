#pragma once

#include <Arduino.h>

namespace RendererConsts
{
    static constexpr uint16_t WIDTH = 240;
    static constexpr uint16_t HEIGHT = 240;

    constexpr uint16_t MAX_SPRITES = 256;

    enum OpType : uint8_t
    {
        OP_FILL_RECT = 0x01,
        OP_DRAW_RECT = 0x02,
        OP_DRAW_CIRCLE = 0x03,
        OP_FILL_CIRCLE = 0x04,
        OP_DRAW_TEXT = 0x05,
        OP_DRAW_NICE_TEXT = 0x06,
        OP_CREATE_SPRITE = 0x07,
        OP_ENTER_SPRITE = 0x08,
        OP_EXIT_SPRITE = 0x09,
        OP_DELETE_SPRITE = 0x0A,
        OP_DRAW_SPRITE = 0x0B,
        OP_DRAW_DITHER_RECT = 0x0C,
        OP_DRAW_LFS_BITMAP = 0x0D,
    };

    enum ParameterType : uint8_t
    {
        PARAM_X = 0x01,
        PARAM_Y = 0x02,
        PARAM_WIDTH = 0x03,
        PARAM_HEIGHT = 0x04,
        PARAM_THICKNESS = 0x05,
        PARAM_COLOR = 0x06,
        PARAM_FILL_COLOR = 0x07,
        PARAM_RADIUS = 0x08,
        PARAM_TEXT = 0x09,
        PARAM_FONT_SIZE = 0x0A,
        PARAM_CUSTOM_FONT = 0x0B,
        PARAM_TEXT_ALIGNMENT = 0x0C,
        PARAM_COLOR_DEPTH = 0x0D,
        PARAM_SPRITE_ID = 0x0E,
        PARAM_IMAGE_DATA = 0x0F,
        PARAM_FILE_NAME = 0x10,
        PARAM_DITHER_COLOR = 0x11,
        PARAM_DITHER_SIZE = 0x12,

        PARAM_COUNT = 19
    };
}