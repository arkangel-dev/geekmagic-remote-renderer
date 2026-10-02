#include <ArduinoJson.h>
#include <ESP8266WebServer.h>
#include <setup_display.h>
#include <settings.h>
#include <debugging.h>
#include <server.h>

void HandleBrightness(ESP8266WebServer &server)
{
  String body = server.arg("plain");
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error)
  {
    DebugLog.print("JSON parse failed: ");
    DebugLog.println(error.c_str());
    server.send(400);
    return;
  }
  SetBrightness(doc["brightness"]);

  JsonDocument settings = GetSettings();
  settings["brightness"] = doc["brightness"];
  SetSettings(settings);
  server.send(200);
}

void SetupDisplayManagementRoutes()
{
  SetupRoute("/api/display/brightness", HTTP_POST, HandleBrightness);
}