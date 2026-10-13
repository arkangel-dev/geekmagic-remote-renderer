#include <cstdint> 
#include <Arduino.h>
#include "callback_manager.h"
#include "server.h"
#include <server-opcodes.h>


// Array to monitor which pins are
// registered for callback activity
bool callbackPins[16] = {false};
bool pinStates[16] = {false};

/**
 * Registers a GPIO pin for state change monitoring
 * so that it can be fed into the websocket
 */
void RegisterCallbackPin(std::uint8_t gpioPin) {
    if (gpioPin >= 16) 
        // There are only 16 GPIO pins (0-15) available
        // on the ESP12F
        return; 

    callbackPins[gpioPin] = true;
    pinMode(gpioPin, INPUT_PULLUP);
}

/**
 * Unregisters a GPIO pin from callback activity monitoring
 * We wouldn't want the websocket channel to be filled up with
 * unwanted noise
 */
void UnregisterCallbackPin(std::uint8_t gpioPin) {
    if (gpioPin >= 16) 
        return;

    callbackPins[gpioPin] = false;
    pinMode(gpioPin, INPUT);
}

/**
 * Sends the state change of a GPIO pin to the websocket
 */
void SendCallbackStateChange(std::uint8_t gpioPin, bool state) {
    std::uint8_t pinValue = gpioPin;
    std::uint8_t stateValue = state ? 1 : 0;
    WebsocketMessageLine messageLines[] = {
        {
            ServerClientConsts::PARAM_PIN_ID,
            &pinValue,
            sizeof(pinValue)
        },
        {
            ServerClientConsts::PARAM_PIN_STATE,
            &stateValue,
            sizeof(stateValue)
        }
    };

    SendWebsocketMessage(
        ServerClientConsts::OP_PIN_STATE_CHANGE,
        messageLines,
        sizeof(messageLines) / sizeof(messageLines[0])
    );
}

/**
 * The main loop will call this function to check the state
 * of the registered pins and sned out changes to websockets
 */
void TickCallbackActivity() {
    for (std::uint8_t gpioPin = 0; gpioPin < 16; ++gpioPin) {
        if (!callbackPins[gpioPin]) continue;

        bool currentState = digitalRead(gpioPin);
        if (currentState != pinStates[gpioPin]) {
            pinStates[gpioPin] = currentState;
            SendCallbackStateChange(gpioPin, currentState);
        }
    }
}