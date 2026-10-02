#include <ESP8266WebServer.h>
#include <debugging.h>
#include <ArduinoJson.h>
#include <server.h>

void HandleGetLogs(ESP8266WebServer &server)
{
  String logs = DebugLog.getBuffer();
  JsonDocument doc;
  doc["logs"] = logs;
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void HandleIsInRecoveryMode(ESP8266WebServer &server)
{
  JsonDocument doc;
  doc["isInRecoveryMode"] = IsInRecoveryMode;
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void SetupStateQueryRoutes()
{
  SetupRoute("/api/debug/get-logs", HTTP_GET, HandleGetLogs);
  SetupRoute("/api/recovery-mode/isactive", HTTP_GET, HandleIsInRecoveryMode);
}