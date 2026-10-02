#include <ESP8266WiFi.h>
#include <ArduinoOTA.h>

void SetupOTAUpdates()
{
    ArduinoOTA.setHostname("esp8266-device");

    ArduinoOTA.onStart([]()
                       { Serial.println("OTA Start"); });

    ArduinoOTA.onEnd([]()
                     { Serial.println("OTA End"); });

    ArduinoOTA.onError([](ota_error_t error)
                       { Serial.printf("Error[%u]\n", error); });

    ArduinoOTA.begin();
}