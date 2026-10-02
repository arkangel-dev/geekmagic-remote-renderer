#include <rendering/renderer-runtime.h>
#include "setup_display.h"
#include <rendering/renderer-constants.h>

namespace RendererRuntime
{
    TFT_eSprite *tempSprites[RendererConsts::MAX_SPRITES] = {};
    uint8_t tempSpriteCount = 0;
    uint8_t currentTempSpriteIndex = 0xFF;

    TFT_eSprite *GetCurrentTempSprite()
    {
        if (currentTempSpriteIndex == 0xFF)
            return nullptr;

        return tempSprites[currentTempSpriteIndex];
    }
}