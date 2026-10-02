#include "security.h"
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <wifi.h>
#include <settings.h>
#include <debugging.h>
#include <server.h>

void HandleAuthentication(ESP8266WebServer &server)
{
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  if (error)
  {
    DebugLog.print("JSON parse failed: ");
    DebugLog.println(error.c_str());
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  const char *password = doc["password"];
  if (!password)
  {
    server.send(400, "application/json", "{\"error\":\"Missing password\"}");
    return;
  }

  const char *saved_password = GetSettings()["password"] | "0000";
  if (strcmp(password, saved_password) != 0)
  {
    server.send(401, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }
  CurrentToken = generateRandomString(32);
  JsonDocument responseDoc;
  responseDoc["token"] = CurrentToken;
  String response;
  serializeJson(responseDoc, response);
  server.send(200, "application/json", response);
}

void SetupSecurityServiceRoutes()
{
  SetupRoute("/api/authenticate", HTTP_POST, HandleAuthentication);
}