#include <cstdint> 
#include <Arduino.h>


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