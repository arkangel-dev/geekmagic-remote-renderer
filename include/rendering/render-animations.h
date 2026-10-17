#pragma once

#include <Arduino.h>

namespace AnimationRendering
{
    /**
     * Starts (or restarts) the animation stored in /assets/<filename>
     * at the given screen position. The animation is streamed from
     * LittleFS and loops until stopped.
     */
    bool StartAnimation(uint8_t animationId, int16_t x, int16_t y, const char *filename);

    /**
     * Stops an animation and releases its memory.
     */
    void StopAnimation(uint8_t animationId);

    /**
     * Advances all running animations by the milliseconds elapsed since
     * the previous call. Called from the main loop.
     */
    void TickAnimations();
}
