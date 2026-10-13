#pragma once

#include <Arduino.h>

// I need to figure out a better
// name for this namespace
namespace ServerClientConsts
{
    enum MessageTypeCode : uint8_t
    {
        OP_PIN_STATE_CHANGE = 0x01,
    };

    enum MessageLineCode : uint8_t
    {
        PARAM_PIN_ID = 0x01,
        PARAM_PIN_STATE = 0x02
    };
}