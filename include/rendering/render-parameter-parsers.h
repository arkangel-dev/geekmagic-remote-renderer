#pragma once

#include <Arduino.h>

namespace RenderUtilities
{
    bool ReadParameter(const uint8_t *data, size_t length, size_t &offset, uint8_t &type, const uint8_t *&value, uint8_t &valueLength);
    bool ReadParameterUInt16(const uint8_t *value, uint8_t length, uint16_t &result);
}
namespace RenderParameterParsers
{

    bool HandleFillRect(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDrawRect(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDrawCircle(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleFillCircle(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDrawText(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDrawNiceText(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleCreateSprite(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleEnterSprite(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleExitSprite(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDeleteSprite(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDrawSprite(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDrawDitherRect(const uint8_t *data, size_t length, uint8_t parameterCount);
    bool HandleDrawLFSBitmap(const uint8_t *data, size_t length, uint8_t parameterCount);
}