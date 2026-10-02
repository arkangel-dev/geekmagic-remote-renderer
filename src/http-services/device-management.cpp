#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <server.h>

void HandleReboot(ESP8266WebServer &server)
{
  server.send(200, "application/json", "{\"status\":\"Rebooting\"}");
  delay(1000);
  ESP.restart();
}


void SetupDeviceManagementRoutes()
{
  SetupRoute("/api/device/reboot", HTTP_POST, HandleReboot);
}