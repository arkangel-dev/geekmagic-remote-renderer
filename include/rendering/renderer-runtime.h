#pragma once

#include <TFT_eSPI.h>
#include <rendering/renderer-constants.h>

namespace RendererRuntime
{
    extern TFT_eSprite *tempSprites[RendererConsts::MAX_SPRITES];
    extern uint8_t tempSpriteCount;
    extern uint8_t currentTempSpriteIndex;
    TFT_eSprite *GetCurrentTempSprite();
}