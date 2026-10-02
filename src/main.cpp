#include <Arduino.h>
#include <LittleFS.h>
#include "setup_display.h"
#include "server.h"
#include "wifi.h"
#include <remote_updates.h>
#include <ArduinoOTA.h>
#include <debugging.h>

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

	DebugLog.println("LittleFS Initialized...");

	if (SetupWifi())
	{

		SetupServer();
		SetupOTAUpdates();
		DebugLog.println("Ready...");

		delay(1000);
		IsDisplayDebugEnabled = false;
		ClearScreen();
	}
	else
	{
		IsInRecoveryMode = true;
	}
}

void loop()
{
	server.handleClient();
	webSocket.loop();
	ArduinoOTA.handle();
}
