#include <rendering/renderer.h>
#include <rendering/renderer-constants.h>
#include <rendering/renderer-runtime.h>
#include <rendering/render-parameter-parsers.h>
#include <debugging.h>

bool RenderContent(
    const uint8_t *data,
    size_t length)
{
    if (length < 5)
        return false;

    if (data[0] != 'G' ||
        data[1] != 'M' ||
        data[2] != 'P')
        return false;

    size_t offset = 3;
    uint16_t operationCount =
        (uint16_t)data[offset] |
        ((uint16_t)data[offset + 1] << 8);

    offset += 2;

    for (uint16_t operation = 0;
         operation < operationCount;
         ++operation)
    {
        if (offset + 2 > length)
            return false;

        uint8_t opType = data[offset++];
        uint8_t parameterCount = data[offset++];
        size_t operationStart = offset;

        bool success;

        switch (opType)
        {
        case RendererConsts::OP_FILL_RECT:
            success =
                RenderParameterParsers::HandleFillRect(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DRAW_RECT:
            success =
                RenderParameterParsers::HandleDrawRect(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DRAW_CIRCLE:
            success =
                RenderParameterParsers::HandleDrawCircle(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_FILL_CIRCLE:
            success =
                RenderParameterParsers::HandleFillCircle(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DRAW_TEXT:
            success =
                RenderParameterParsers::HandleDrawText(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DRAW_NICE_TEXT:
            success =
                RenderParameterParsers::HandleDrawNiceText(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_CREATE_SPRITE:
            success =
                RenderParameterParsers::HandleCreateSprite(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_ENTER_SPRITE:
            success =
                RenderParameterParsers::HandleEnterSprite(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_EXIT_SPRITE:
            success =
                RenderParameterParsers::HandleExitSprite(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DELETE_SPRITE:
            success =
                RenderParameterParsers::HandleDeleteSprite(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DRAW_SPRITE:
            success =
                RenderParameterParsers::HandleDrawSprite(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DRAW_DITHER_RECT:
            success =
                RenderParameterParsers::HandleDrawDitherRect(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        case RendererConsts::OP_DRAW_LFS_BITMAP:
            success =
                RenderParameterParsers::HandleDrawLFSBitmap(
                    data + operationStart,
                    length - operationStart,
                    parameterCount);
            break;

        default:
            DebugLog.print(
                F("RenderContent: unsupported operation: "));
            DebugLog.println(opType);
            return false;
        }

        if (!success)
            return false;

        for (uint8_t parameter = 0;
             parameter < parameterCount;
             ++parameter)
        {
            if (offset + 3 > length)
                return false;

            uint16_t valueLength =
                (uint16_t)data[offset + 1] |
                ((uint16_t)data[offset + 2] << 8);

            offset += 3;

            if (offset + valueLength > length)
                return false;

            offset += valueLength;
        }
    }

    if (offset != length)
        return false;
    return true;
}