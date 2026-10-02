#include <rendering/render-parameter-parsers.h>
#include <rendering/renderer-constants.h>
#include <rendering/renderer-runtime.h>
#include <setup_display.h>
#include <debugging.h>
#include <LittleFS.h>
#include <TJpg_Decoder.h>

namespace
{
    TFT_eSprite *jpegSprite = nullptr;
    int jpegX = 0;
    int jpegY = 0;
    int jpegWidth = 0;
    int jpegHeight = 0;

    bool DrawJpegBlock(int16_t blockX, int16_t blockY, uint16_t blockWidth, uint16_t blockHeight, uint16_t *pixels)
    {
        for (uint16_t row = 0; row < blockHeight; ++row)
        {
            for (uint16_t column = 0; column < blockWidth; ++column)
            {
                int drawX = blockX + column;
                int drawY = blockY + row;
                if (drawX < jpegX || drawX >= jpegX + jpegWidth ||
                    drawY < jpegY || drawY >= jpegY + jpegHeight)
                    continue;

                uint16_t color = pixels[row * blockWidth + column];
                if (jpegSprite != nullptr)
                    jpegSprite->drawPixel(drawX, drawY, color);
                else
                    tft.drawPixel(drawX, drawY, color);
            }
        }
        return true;
    }
}

namespace RenderUtilities
{
    bool ReadParameter(const uint8_t *data, size_t length, size_t &offset, uint8_t &type, const uint8_t *&value, uint16_t &valueLength)
    {
        if (offset + 3 > length)
            return false;

        type = data[offset];
        offset += 1;
        uint8_t lowByte = data[offset];
        offset += 1;
        uint8_t highByte = data[offset];
        offset += 1;
        valueLength = (uint16_t)lowByte | ((uint16_t)highByte << 8);

        if (offset + valueLength > length)
            return false;

        value = &data[offset];
        offset += valueLength;
        return true;
    }

    bool ReadParameterUInt16(const uint8_t *value, uint16_t length, uint16_t &result)
    {
        if (length != 2)
            return false;
        result = (uint16_t)value[0] | ((uint16_t)value[1] << 8);
        return true;
    }
    struct Parameter
    {
        bool present = false;
        const uint8_t *data = nullptr;
        uint16_t length = 0;
        uint16_t value = 0;
    };
    using ParameterArray = Parameter[RendererConsts::PARAM_COUNT];
    bool ReadParams(const uint8_t *data, size_t length, uint8_t parameterCount, RenderUtilities::ParameterArray params)
    {
        size_t offset = 0;

        for (uint8_t i = 0; i < parameterCount; ++i)
        {
            if (offset + 3 > length)
            {
                DebugLog.print(F("ReadParams: insufficient data for parameter "));
                return false;
            }

            uint8_t type = data[offset];
            offset += 1;
            uint8_t lowByte = data[offset];
            offset += 1;
            uint8_t highByte = data[offset];
            offset += 1;
            uint16_t valueLength = (uint16_t)lowByte | ((uint16_t)highByte << 8);

            if (type >= RendererConsts::PARAM_COUNT)
            {
                DebugLog.print(F("ReadParams: invalid parameter type: "));
                DebugLog.println(type);
                return false;
            }

            if (offset + valueLength > length)
            {
                DebugLog.print(F("ReadParams: insufficient data for parameter value, expected length: "));
                DebugLog.println(valueLength);
                return false;
            }

            params[type].present = true;
            params[type].data = &data[offset];
            params[type].length = valueLength;

            if (valueLength == 2)
            {
                params[type].value =
                    (uint16_t)data[offset] |
                    ((uint16_t)data[offset + 1] << 8);
            }

            offset += valueLength;
        }

        return true;
    }
}

namespace RenderParameterParsers
{
    bool HandleFillRect(const uint8_t *data, size_t length, uint8_t parameterCount)
    {

        RenderUtilities::ParameterArray params;

        if (!ReadParams(data, length, parameterCount, params))
            return false;

        int x = (int16_t)params[RendererConsts::PARAM_X].value;
        int y = (int16_t)params[RendererConsts::PARAM_Y].value;
        int width = params[RendererConsts::PARAM_WIDTH].value;
        int height = params[RendererConsts::PARAM_HEIGHT].value;
        int radius = params[RendererConsts::PARAM_RADIUS].present ? params[RendererConsts::PARAM_RADIUS].value : 0;
        uint16_t color = params[RendererConsts::PARAM_FILL_COLOR].value;

        TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite();
        if (currentSprite != nullptr)
        {
            currentSprite->fillRoundRect(x, y, width, height, radius, color);
            return true;
        }

        tft.fillRoundRect(x, y, width, height, radius, color);
        return true;
    }

    bool HandleDrawRect(const uint8_t *data, size_t length, uint8_t parameterCount)
    {

        RenderUtilities::ParameterArray params;

        if (!ReadParams(data, length, parameterCount, params))
            return false;

        int x = (int16_t)params[RendererConsts::PARAM_X].value;
        int y = (int16_t)params[RendererConsts::PARAM_Y].value;
        int width = params[RendererConsts::PARAM_WIDTH].value;
        int height = params[RendererConsts::PARAM_HEIGHT].value;
        int thickness = params[RendererConsts::PARAM_THICKNESS].present ? params[RendererConsts::PARAM_THICKNESS].value : 1;
        int radius = params[RendererConsts::PARAM_RADIUS].present ? params[RendererConsts::PARAM_RADIUS].value : 0;
        uint16_t strokeColor = params[RendererConsts::PARAM_COLOR].value;

        if (width <= 0 || height <= 0 || thickness <= 0)
            return false;

        TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite();
        for (int i = 0; i < thickness; ++i)
        {
            if (currentSprite != nullptr)
            {
                currentSprite->drawRoundRect(
                    x + i,
                    y + i,
                    width - (i * 2),
                    height - (i * 2),
                    radius,
                    strokeColor);
            }
            else
            {
                tft.drawRoundRect(
                    x + i,
                    y + i,
                    width - (i * 2),
                    height - (i * 2),
                    radius,
                    strokeColor);
            }
        }
        return true;
    }

    bool HandleDrawCircle(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;
        if (!ReadParams(data, length, parameterCount, params))
            return false;

        int x = (int16_t)params[RendererConsts::PARAM_X].value;
        int y = (int16_t)params[RendererConsts::PARAM_Y].value;
        int radius = params[RendererConsts::PARAM_RADIUS].value;
        int thickness = params[RendererConsts::PARAM_THICKNESS].value;
        uint16_t color = params[RendererConsts::PARAM_COLOR].value;

        if (radius <= 0)
            return false;

        TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite();
        if (currentSprite != nullptr)
        {
            currentSprite->drawCircle(x, y, radius, color);
            for (int i = 0; i < thickness - 1; ++i)
                currentSprite->drawCircle(x, y, radius - i, color);
            return true;
        }
        tft.drawCircle(x, y, radius, color);
        for (int i = 0; i < thickness - 1; ++i)
            tft.drawCircle(x, y, radius - i, color);
        return true;
    }

    bool HandleFillCircle(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;

        if (!ReadParams(data, length, parameterCount, params))
            return false;
        int x = (int16_t)params[RendererConsts::PARAM_X].value;
        int y = (int16_t)params[RendererConsts::PARAM_Y].value;
        int radius = params[RendererConsts::PARAM_RADIUS].value;
        uint16_t color = params[RendererConsts::PARAM_FILL_COLOR].value;

        if (radius <= 0)
            return false;

        if (TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite())
        {
            currentSprite->fillCircle(x, y, radius, color);
            return true;
        }

        tft.fillCircle(x, y, radius, color);
        return true;
    }

    bool HandleDrawText(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;
        if (!ReadParams(data, length, parameterCount, params))
            return false;

        int x = (int16_t)params[RendererConsts::PARAM_X].value;
        int y = (int16_t)params[RendererConsts::PARAM_Y].value;
        int fontSize = params[RendererConsts::PARAM_FONT_SIZE].value;
        uint16_t color = params[RendererConsts::PARAM_COLOR].value;
        auto &text = params[RendererConsts::PARAM_TEXT];

        if (!text.present || text.length == 0)
        {
            DebugLog.println(F("HandleDrawText: Missing or empty text parameter."));
            return false;
        }

        char buffer[text.length + 1];
        memcpy(buffer, text.data, text.length);
        buffer[text.length] = '\0';

        if (TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite())
        {
            currentSprite->setTextSize(fontSize);
            currentSprite->setTextColor(color);
            currentSprite->setCursor(x, y);
            currentSprite->drawString(buffer, x, y);
            return true;
        }

        tft.setTextSize(fontSize);
        tft.setTextColor(color);
        tft.setCursor(x, y);
        tft.drawString(buffer, x, y);
        return true;
    }

    bool HandleDrawNiceText(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;

        if (!ReadParams(data, length, parameterCount, params))
            return false;

        int x = (int16_t)params[RendererConsts::PARAM_X].value;
        int y = (int16_t)params[RendererConsts::PARAM_Y].value;
        uint16_t color = params[RendererConsts::PARAM_COLOR].value;
        int alignment = (int8_t)params[RendererConsts::PARAM_TEXT_ALIGNMENT].value;
        auto &text = params[RendererConsts::PARAM_TEXT];
        auto &fontName = params[RendererConsts::PARAM_CUSTOM_FONT];

        if (!text.present || text.length == 0 || !fontName.present || fontName.length == 0 || alignment > 11)
            return false;

        // Load the font from the lfs
        const char fontFolder[] = "/assets/";
        char fontPath[sizeof(fontFolder) + fontName.length + 1];
        memcpy(fontPath, fontFolder, sizeof(fontFolder) - 1);
        memcpy(fontPath + sizeof(fontFolder) - 1, fontName.data, fontName.length);
        fontPath[sizeof(fontFolder) - 1 + fontName.length] = '\0';

        char buffer[text.length + 1];
        memcpy(buffer, text.data, text.length);
        buffer[text.length] = '\0';

        if (TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite())
        {
            currentSprite->loadFont(fontPath, LittleFS);
            currentSprite->setTextColor(color);
            currentSprite->setTextDatum(alignment);
            currentSprite->drawString(buffer, x, y);
            currentSprite->unloadFont();
            return true;
        }

        tft.loadFont(fontPath, LittleFS);
        tft.setTextColor(color);
        tft.setTextDatum(alignment);
        tft.drawString(buffer, x, y);
        tft.unloadFont();
        return true;
    }

    bool HandleCreateSprite(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;

        if (!ReadParams(data, length, parameterCount, params))
        {
            DebugLog.println(F("HandleCreateSprite: Failed to read parameters."));
            return false;
        }

        auto &widthParam = params[RendererConsts::PARAM_WIDTH];
        auto &heightParam = params[RendererConsts::PARAM_HEIGHT];
        auto &colorDepthParam = params[RendererConsts::PARAM_COLOR_DEPTH];
        auto &spriteIdParam = params[RendererConsts::PARAM_SPRITE_ID];

        if (!widthParam.present ||
            !heightParam.present ||
            !colorDepthParam.present ||
            !spriteIdParam.present)
        {
            DebugLog.println(F("HandleCreateSprite: Missing required parameters."));
            return false;
        }

        int width = widthParam.value;
        int height = heightParam.value;
        uint16_t colorDepth = colorDepthParam.value;
        uint16_t spriteId = spriteIdParam.value;

        if (width <= 0 || height <= 0 || colorDepth <= 0 || spriteId < 0 || spriteId >= RendererConsts::MAX_SPRITES)
        {
            DebugLog.println(F("HandleCreateSprite: Invalid parameter values."));
            return false;
        }

        if (RendererRuntime::tempSprites[spriteId] == nullptr)
            RendererRuntime::tempSprites[spriteId] = new TFT_eSprite(&tft);

        RendererRuntime::tempSprites[spriteId]->deleteSprite();
        RendererRuntime::tempSprites[spriteId]->setColorDepth(colorDepth);
        if (!RendererRuntime::tempSprites[spriteId]->createSprite(width, height))
        {
            DebugLog.println(F("HandleCreateSprite: Failed to create sprite."));
            RendererRuntime::tempSprites[spriteId]->deleteSprite();
            return false;
        }
        // RendererRuntime::currentTempSpriteIndex = spriteId;
        return true;
    }

    bool HandleEnterSprite(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;
        if (!ReadParams(data, length, parameterCount, params))
            return false;

        auto &spriteIdParam = params[RendererConsts::PARAM_SPRITE_ID];
        if (!spriteIdParam.present)
            return false;

        uint16_t spriteId = spriteIdParam.value;
        if (spriteId < 0 || spriteId >= RendererConsts::MAX_SPRITES)
            return false;

        if (RendererRuntime::tempSprites[spriteId] == nullptr)
            return false;

        RendererRuntime::currentTempSpriteIndex = spriteId;
        return true;
    }

    bool HandleExitSprite(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        // Reset to no active sprite
        RendererRuntime::currentTempSpriteIndex = 0xFF;
        return true;
    }

    bool HandleDeleteSprite(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;
        if (!ReadParams(data, length, parameterCount, params))
            return false;

        auto &spriteIdParam = params[RendererConsts::PARAM_SPRITE_ID];
        if (!spriteIdParam.present)
            return false;

        uint16_t spriteId = spriteIdParam.value;
        if (spriteId < 0 || spriteId >= RendererConsts::MAX_SPRITES)
            return false;

        if (RendererRuntime::tempSprites[spriteId] != nullptr)
            RendererRuntime::tempSprites[spriteId]->deleteSprite();
        return true;
    }

    bool HandleDrawSprite(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;

        if (!ReadParams(data, length, parameterCount, params))
            return false;

        auto &xParam = params[RendererConsts::PARAM_X];
        auto &yParam = params[RendererConsts::PARAM_Y];
        auto &spriteIdParam = params[RendererConsts::PARAM_SPRITE_ID];

        if (!xParam.present ||
            !yParam.present ||
            !spriteIdParam.present)
            return false;

        int x = (int16_t)xParam.value;
        int y = (int16_t)yParam.value;
        uint16_t spriteId = spriteIdParam.value;

        if (spriteId < 0 || spriteId >= RendererConsts::MAX_SPRITES)
            return false;

        if (RendererRuntime::tempSprites[spriteId] == nullptr)
            return false;

        TFT_eSprite *sprite = RendererRuntime::tempSprites[spriteId];
        sprite->pushSprite(x, y);
        return true;
    }

    // bool HandleDrawImage(const uint8_t *data, size_t length, uint8_t parameterCount)
    // {
    //     RenderUtilities::ParameterArray params;

    //     if (!ReadParams(data, length, parameterCount, params))
    //         return false;

    //     auto &xParam = params[RendererConsts::PARAM_X];
    //     auto &yParam = params[RendererConsts::PARAM_Y];
    //     auto &widthParam = params[RendererConsts::PARAM_WIDTH];
    //     auto &heightParam = params[RendererConsts::PARAM_HEIGHT];
    //     auto &imageData = params[RendererConsts::PARAM_IMAGE_DATA];

    //     if (!xParam.present ||
    //         !yParam.present ||
    //         !widthParam.present ||
    //         !heightParam.present ||
    //         !imageData.present)
    //         return false;

    //     int x = (int16_t)xParam.value;
    //     int y = (int16_t)yParam.value;
    //     int width = widthParam.value;
    //     int height = heightParam.value;

    //     if (width <= 0 || height <= 0)
    //         return false;

    //     size_t requiredBytes =
    //         (size_t)width * height * sizeof(uint16_t);

    //     if (imageData.length != requiredBytes)
    //         return false;

    //     TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite();
    //     if (currentSprite != nullptr)
    //     {
    //         DebugLog.println(F("HandleDrawImage: Drawing image to current sprite."));
    //         currentSprite->setSwapBytes(true);
    //         currentSprite->pushImage(x, y, width, height, reinterpret_cast<const uint16_t *>(imageData.data));
    //         return true;
    //     }

    //     tft.setSwapBytes(true);
    //     tft.pushImage(x, y, width, height, reinterpret_cast<const uint16_t *>(imageData.data));
    //     tft.setSwapBytes(false);
    //     return true;
    // }

    bool HandleDrawLFSBitmap(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;
        if (!ReadParams(data, length, parameterCount, params))
        {
            DebugLog.println(F("HandleDrawLFSBitmap: Failed to read parameters."));
            return false;
        }

        auto &xParam = params[RendererConsts::PARAM_X];
        auto &yParam = params[RendererConsts::PARAM_Y];
        auto &widthParam = params[RendererConsts::PARAM_WIDTH];
        auto &heightParam = params[RendererConsts::PARAM_HEIGHT];
        auto &filenameParam = params[RendererConsts::PARAM_FILE_NAME];

        if (!xParam.present || !yParam.present || !widthParam.present ||
            !heightParam.present || !filenameParam.present || filenameParam.length == 0)
        {
            DebugLog.println(F("HandleDrawLFSBitmap: Missing required parameters."));
            return false;
        }

        int x = (int16_t)xParam.value;
        int y = (int16_t)yParam.value;
        int width = widthParam.value;
        int height = heightParam.value;
        if (width <= 0 || height <= 0 || filenameParam.length > (size_t)127)
        {
            DebugLog.println(F("HandleDrawLFSBitmap: Invalid width, height, or filename length."));
            return false;
        }

        char filename[128];
        memcpy(filename, filenameParam.data, filenameParam.length);
        filename[filenameParam.length] = '\0';
        if (strstr(filename, "..") != nullptr || strchr(filename, '/') != nullptr || strchr(filename, '\\') != nullptr)
        {
            DebugLog.println(F("HandleDrawLFSBitmap: Invalid filename."));
            return false;
        }

        String path = "/assets/";
        path += filename;
        File file = LittleFS.open(path, "r");
        if (!file)
        {
            DebugLog.println(F("HandleDrawLFSBitmap: Failed to open file."));
            return false;
        }

        TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite();
        jpegSprite = currentSprite;
        jpegX = x;
        jpegY = y;
        jpegWidth = width;
        jpegHeight = height;

        TJpgDec.setCallback(DrawJpegBlock);
        TJpgDec.setJpgScale(1);
        file.close();
        JRESULT result = TJpgDec.drawFsJpg(x, y, path, LittleFS);

        jpegSprite = nullptr;
        if (result != JDR_OK)
        {
            DebugLog.print(F("HandleDrawLFSBitmap: JPEG decode failed, code "));
            DebugLog.println((int)result);
            return false;
        }

        return true;
    }

    bool HandleDrawDitherRect(const uint8_t *data, size_t length, uint8_t parameterCount)
    {
        RenderUtilities::ParameterArray params;
        if (!ReadParams(data, length, parameterCount, params))
            return false;

        int x = (int16_t)params[RendererConsts::PARAM_X].value;
        int y = (int16_t)params[RendererConsts::PARAM_Y].value;
        int width = params[RendererConsts::PARAM_WIDTH].value;
        int height = params[RendererConsts::PARAM_HEIGHT].value;
        int ditherColor = params[RendererConsts::PARAM_DITHER_COLOR].value;
        int ditherSize = params[RendererConsts::PARAM_DITHER_SIZE].value;
        uint16_t color = params[RendererConsts::PARAM_FILL_COLOR].value;

        if (width <= 0 || height <= 0 || ditherSize <= 0)
            return false;

        TFT_eSprite *currentSprite = RendererRuntime::GetCurrentTempSprite();
        if (currentSprite != nullptr)
            currentSprite->fillRect(x, y, width, height, color);
        else
            tft.fillRect(x, y, width, height, color);

        for (int row = 0; row < height; row += ditherSize)
        {
            for (int column = 0; column < width; column += ditherSize)
            {
                if (((row / ditherSize) + (column / ditherSize)) % 2 != 0)
                    continue;

                int blockWidth = min(ditherSize, width - column);
                int blockHeight = min(ditherSize, height - row);
                if (currentSprite != nullptr)
                    currentSprite->fillRect(x + column, y + row, blockWidth, blockHeight, ditherColor);
                else
                    tft.fillRect(x + column, y + row, blockWidth, blockHeight, ditherColor);
            }
        }
        return true;
    }
}