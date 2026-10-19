#include <new>
#include <rendering/render-animations.h>
#include <rendering/renderer-constants.h>
#include <setup_display.h>
#include <debugging.h>
#include <LittleFS.h>

namespace AnimationRendering
{
    namespace
    {
        constexpr char MAGIC[] = "GMPANIF1";
        constexpr size_t MAGIC_SIZE = 8;
        constexpr size_t FILENAME_MAX_LENGTH = 63;
        constexpr size_t FRAME_HEADER_SIZE = 4;
        constexpr size_t PIXEL_SIZE = 3;

        // Pixels drawn per animation per tick, so one big frame doesn't
        // stall the websocket and HTTP handlers in the main loop
        constexpr uint16_t PIXEL_BUDGET_PER_TICK = 2048;
        constexpr uint8_t PIXEL_CHUNK = 80;
        constexpr uint16_t MAX_SPAN = 256;

        /**
         * Only the playback cursor and the palette live in RAM.
         * Frame data is read from the file as it is drawn.
         */
        struct AnimationState
        {
            char filename[FILENAME_MAX_LENGTH + 1];
            int16_t origin_x;
            int16_t origin_y;
            uint8_t width;
            uint8_t height;
            uint16_t frame_count;
            uint16_t palette_size;
            uint16_t *palette;

            /** Index of the next frame whose header has to be read */
            uint16_t next_frame;

            /** File offset of the next frame header */
            uint32_t next_header_offset;

            /** True while the current frame header has been loaded */
            bool frame_loaded;

            /**
             * Milliseconds left before the loaded frame is drawn.
             * Decrements once per elapsed millisecond.
             */
            uint16_t delay_counter;

            uint16_t pixels_remaining;

            /** File offset of the next pixel to draw in the loaded frame */
            uint32_t pixel_offset;
        };

        AnimationState *animations[RendererConsts::MAX_ANIMATIONS] = {};
        uint32_t lastTickMs = 0;
        bool hasTicked = false;

        uint16_t ReadU16(const uint8_t *bytes)
        {
            return (uint16_t)bytes[0] | ((uint16_t)bytes[1] << 8);
        }

        void Release(uint8_t animationId)
        {
            AnimationState *state = animations[animationId];
            if (state == nullptr)
                return;

            free(state->palette);
            free(state);
            animations[animationId] = nullptr;
        }

        bool LoadFrameHeader(AnimationState &state, File &file)
        {
            uint8_t header[FRAME_HEADER_SIZE];
            if (!file.seek(state.next_header_offset) ||
                file.read(header, FRAME_HEADER_SIZE) != FRAME_HEADER_SIZE)
                return false;

            state.delay_counter = ReadU16(header);
            state.pixels_remaining = ReadU16(header + 2);
            state.pixel_offset = state.next_header_offset + FRAME_HEADER_SIZE;
            state.next_header_offset = state.pixel_offset + (uint32_t)state.pixels_remaining * PIXEL_SIZE;
            state.frame_loaded = true;

            // Loop back to the first frame after the last one
            state.next_frame++;
            if (state.next_frame >= state.frame_count)
            {
                state.next_frame = 0;
                state.next_header_offset = MAGIC_SIZE + 3 + (uint32_t)state.palette_size * 2 + 2;
            }
            return true;
        }

        bool DrawPixels(AnimationState &state, File &file)
        {
            if (!file.seek(state.pixel_offset))
                return false;

            // Horizontally contiguous pixels are collected into a span and
            // sent as one window write instead of one window per pixel
            uint16_t span[MAX_SPAN];
            uint16_t spanLength = 0;
            int16_t spanX = 0, spanY = 0;

            // The palette is native order; swap so it goes out big-endian
            bool previousSwap = tft.getSwapBytes();
            tft.setSwapBytes(true);

            auto flushSpan = [&]()
            {
                if (spanLength == 0)
                    return;
                if (spanLength == 1)
                    tft.drawPixel(state.origin_x + spanX, state.origin_y + spanY, span[0]);
                else
                    tft.pushImage(state.origin_x + spanX, state.origin_y + spanY, spanLength, 1, span);
                spanLength = 0;
            };

            uint16_t budget = PIXEL_BUDGET_PER_TICK;
            uint8_t chunk[PIXEL_CHUNK * PIXEL_SIZE];
            bool success = true;

            while (state.pixels_remaining > 0 && budget > 0)
            {
                uint16_t count = state.pixels_remaining;
                if (count > budget)
                    count = budget;
                if (count > PIXEL_CHUNK)
                    count = PIXEL_CHUNK;

                size_t bytes = (size_t)count * PIXEL_SIZE;
                if (file.read(chunk, bytes) != bytes)
                {
                    success = false;
                    break;
                }

                for (uint16_t i = 0; i < count; ++i)
                {
                    uint8_t px = chunk[i * PIXEL_SIZE];
                    uint8_t py = chunk[i * PIXEL_SIZE + 1];
                    uint8_t index = chunk[i * PIXEL_SIZE + 2];
                    if (index >= state.palette_size)
                        continue;

                    uint16_t color = state.palette[index];
                    if (spanLength > 0 && py == spanY && px == spanX + spanLength && spanLength < MAX_SPAN)
                    {
                        span[spanLength++] = color;
                        continue;
                    }

                    flushSpan();
                    spanX = px;
                    spanY = py;
                    span[0] = color;
                    spanLength = 1;
                }

                state.pixels_remaining -= count;
                state.pixel_offset += bytes;
                budget -= count;
            }

            flushSpan();
            tft.setSwapBytes(previousSwap);

            if (state.pixels_remaining == 0)
                state.frame_loaded = false;
            return success;
        }

        // Returns false if the animation can't continue
        bool StepAnimation(AnimationState &state, uint32_t elapsedMs)
        {
            if (state.frame_loaded && state.delay_counter > 0)
            {
                state.delay_counter = elapsedMs >= state.delay_counter
                                          ? 0
                                          : state.delay_counter - elapsedMs;
                return true;
            }

            String path = "/assets/";
            path += state.filename;
            File file = LittleFS.open(path, "r");
            if (!file)
                return false;

            bool ok = true;
            if (!state.frame_loaded)
                ok = LoadFrameHeader(state, file);

            if (ok && state.delay_counter == 0)
                ok = DrawPixels(state, file);

            file.close();
            return ok;
        }
    }

    bool StartAnimation(uint8_t animationId, int16_t x, int16_t y, const char *filename)
    {
        if (animationId >= RendererConsts::MAX_ANIMATIONS || filename == nullptr)
            return false;

        size_t nameLength = strlen(filename);
        if (nameLength == 0 || nameLength > FILENAME_MAX_LENGTH ||
            strstr(filename, "..") != nullptr || strchr(filename, '/') != nullptr ||
            strchr(filename, '\\') != nullptr)
        {
            DebugLog.println(F("StartAnimation: Invalid filename."));
            return false;
        }

        String path = "/assets/";
        path += filename;
        File file = LittleFS.open(path, "r");
        if (!file)
        {
            DebugLog.println(F("StartAnimation: Failed to open file."));
            return false;
        }

        uint8_t header[MAGIC_SIZE + 3];
        if (file.read(header, sizeof(header)) != sizeof(header) ||
            memcmp(header, MAGIC, MAGIC_SIZE) != 0)
        {
            DebugLog.println(F("StartAnimation: Invalid animation header."));
            file.close();
            return false;
        }

        uint16_t paletteSize = header[MAGIC_SIZE + 2];
        uint16_t *palette = (uint16_t *)malloc((paletteSize > 0 ? paletteSize : 1) * sizeof(uint16_t));
        uint8_t frameCountBytes[2];
        if (palette == nullptr ||
            file.read((uint8_t *)palette, paletteSize * 2) != (size_t)paletteSize * 2 ||
            file.read(frameCountBytes, 2) != 2 ||
            ReadU16(frameCountBytes) == 0)
        {
            DebugLog.println(F("StartAnimation: Invalid palette or frame count."));
            free(palette);
            file.close();
            return false;
        }
        file.close();

        AnimationState *state = (AnimationState *)malloc(sizeof(AnimationState));
        if (state == nullptr)
        {
            free(palette);
            return false;
        }

        memset(state, 0, sizeof(AnimationState));
        strcpy(state->filename, filename);
        state->origin_x = x;
        state->origin_y = y;
        state->height = header[MAGIC_SIZE];
        state->width = header[MAGIC_SIZE + 1];
        state->palette = palette;
        state->palette_size = paletteSize;
        state->frame_count = ReadU16(frameCountBytes);
        state->next_header_offset = MAGIC_SIZE + 3 + (uint32_t)paletteSize * 2 + 2;

        AnimationState *previous = animations[animationId];
        if (previous != nullptr &&
            (previous->origin_x != state->origin_x || previous->origin_y != state->origin_y ||
             previous->width != state->width || previous->height != state->height))
        {
            tft.fillRect(previous->origin_x, previous->origin_y, previous->width, previous->height, TFT_BLACK);
        }

        Release(animationId);
        animations[animationId] = state;
        return true;
    }

    void StopAnimation(uint8_t animationId)
    {
        if (animationId >= RendererConsts::MAX_ANIMATIONS)
            return;

        AnimationState *state = animations[animationId];
        if (state != nullptr)
            tft.fillRect(state->origin_x, state->origin_y, state->width, state->height, TFT_BLACK);
        Release(animationId);
    }

    void StopAllAnimations()
    {
        for (uint16_t id = 0; id < RendererConsts::MAX_ANIMATIONS; ++id)
            StopAnimation((uint8_t)id);
    }

    void TickAnimations()
    {
        uint32_t now = millis();
        if (!hasTicked)
        {
            hasTicked = true;
            lastTickMs = now;
            return;
        }

        uint32_t elapsed = now - lastTickMs;
        if (elapsed == 0)
            return;
        lastTickMs = now;

        for (uint16_t id = 0; id < RendererConsts::MAX_ANIMATIONS; ++id)
        {
            AnimationState *state = animations[id];
            if (state != nullptr && !StepAnimation(*state, elapsed))
            {
                DebugLog.println(F("TickAnimations: Animation failed, stopping."));
                Release(id);
            }
        }
    }
}
