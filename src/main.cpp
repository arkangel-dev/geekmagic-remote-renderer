#include <Arduino.h>
#include <LittleFS.h>
#include "setup_display.h"
#include "server.h"
#include "wifi.h"
#include <remote_updates.h>
#include <ArduinoOTA.h>
#include <debugging.h>
// int buttonPin = 10; // GPIO4 = physical pin 19 on the ESP-12 module
void setup()
{
	DebugLog.println("Initializing LittleFS...");
	if (!LittleFS.begin())
	{
		DebugLog.println("LittleFS Mount Failed!");
		while (true)
			;
	}
	Serial.begin(115200);
	Serial.println();
	InitDisplay();
	// pinMode(buttonPin, INPUT_PULLUP);

	DebugLog.println("LittleFS Initialized...");

	if (SetupWifi())
	{

		SetupServer();
		SetupOTAUpdates();
		DebugLog.println("Ready...");

		delay(1000);
		IsDisplayDebugEnabled = false;
		// ClearScreen();
	}
	else
	{
		IsInRecoveryMode = true;
	}
}

// int previousState = HIGH;
void loop()
{
	// previousState = digitalRead(buttonPin);
	// int currentButtonState = digitalRead(buttonPin);
	// Serial.println(currentButtonState);
	// int currentButtonState = digitalRead(buttonPin);
	// DebugLog.clearBuffer();
	// DebugLog.println("Current button state: " + String(currentButtonState));
	// if (previousState != currentButtonState)
	// {
	// 	DebugLog.println("Button state changed: " + String(currentButtonState));
	// }
	// previousState = currentButtonState;
	server.handleClient();
	webSocket.loop();
	ArduinoOTA.handle();
	// delay(100);
}
