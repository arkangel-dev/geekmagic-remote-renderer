#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <settings.h>
#include <debugging.h>
#include "settings.h"
#include <server.h>

void HandleGetSettings(ESP8266WebServer &server)
{
  JsonDocument settings = GetSettings();
  String response;
  serializeJson(settings, response);
  server.send(200, "application/json", response);
}

void HandleSetSettings(ESP8266WebServer &server)
{
  String body = server.arg("plain");
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error)
  {
    DebugLog.print("JSON parse failed: ");
    DebugLog.println(error.c_str());
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }


  SetSettings(doc);
  server.send(200, "application/json", "{\"status\":\"Settings updated\"}");
}

void SetupSettingsRoutes()
{
  SetupRoute("/api/settings/get-settings", HTTP_GET, HandleGetSettings);
  SetupRoute("/api/settings/set-settings", HTTP_POST, HandleSetSettings);
}