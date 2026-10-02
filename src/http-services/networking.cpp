#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <setup_display.h>
#include <LittleFS.h>
#include "security.h"
#include <settings.h>
#include <debugging.h>
#include <wifi.h>
#include <server.h>



void HandleGetAvailableConnections(ESP8266WebServer &server)
{
  JsonDocument doc;
  JsonArray networks = doc["networks"].to<JsonArray>();

  int numNetworks = WiFi.scanNetworks();
  DebugLog.print("Networks found: ");
  DebugLog.println(numNetworks);

  for (int i = 0; i < numNetworks; i++)
  {
    JsonObject network = networks.add<JsonObject>();
    network["ssid"] = WiFi.SSID(i);
    network["bssid"] = WiFi.BSSIDstr(i);
    network["is_secured"] = (WiFi.encryptionType(i) != ENC_TYPE_NONE);
    network["strength"] = WiFi.RSSI(i);
  }

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void HandleSetConnection(ESP8266WebServer &server)
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

  const char *ssid = doc["ssid"];
  const char *password = doc["password"];

  if (!ssid || !password)
  {
    server.send(400, "application/json", "{\"error\":\"Missing ssid or password\"}");
    return;
  }

  DebugLog.print("Connecting to SSID: ");
  DebugLog.println(ssid);

  DebugLog.print("Using Password: ");
  DebugLog.println(password);

  WiFi.begin(ssid, password);

  int maxRetries = 20;
  while (WiFi.status() != WL_CONNECTED && maxRetries > 0)
  {
    delay(500);
    DebugLog.print(".");
    maxRetries--;
  }

  if (WiFi.status() != WL_CONNECTED)
  {
    DebugLog.println("\nFailed to connect to WiFi");
    server.send(500, "application/json", "{\"error\":\"Failed to connect to WiFi\"}");
    return;
  }

  DebugLog.println("\nConnected to WiFi");

  // Open known_networks.json in read mode
  File file = LittleFS.open("/known_networks.json", "r");
  JsonDocument knownNetworksDoc;

  if (file)
  {
    DeserializationError readError = deserializeJson(knownNetworksDoc, file);
    file.close();

    if (readError)
    {
      DebugLog.println("Failed to parse known_networks.json, creating a new one.");
      knownNetworksDoc["networks"] = JsonArray();
    }
  }
  else
  {
    DebugLog.println("known_networks.json not found, creating a new one.");
    knownNetworksDoc["networks"] = JsonArray();
  }

  // Append the new network to the array
  JsonArray networks = knownNetworksDoc["networks"].to<JsonArray>();
  JsonObject newNetwork = networks.createNestedObject();
  newNetwork["ssid"] = ssid;
  newNetwork["password"] = password;

  // Save updated known_networks.json
  file = LittleFS.open("/known_networks.json", "w");
  if (!file)
  {
    DebugLog.println("Failed to open known_networks.json for writing");
    server.send(500, "application/json", "{\"error\":\"Failed to save network\"}");
    return;
  }

  serializeJson(knownNetworksDoc, file);
  file.close();

  server.send(200, "application/json", "{\"status\":\"Connected and saved\"}");

  delay(1000);
  ESP.restart();
}

void HandleGetNetworks(ESP8266WebServer &server)
{
  // Open known_networks.json in read mode
  File file = LittleFS.open("/known_networks.json", "r");
  if (!file)
  {
    DebugLog.println("Failed to open known_networks.json");
    server.send(500, "application/json", "{\"error\":\"Failed to open known_networks.json\"}");
    return;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, file);
  file.close();

  if (error)
  {
    DebugLog.print("Failed to parse known_networks.json: ");
    DebugLog.println(error.c_str());
    server.send(500, "application/json", "{\"error\":\"Failed to parse known_networks.json\"}");
    return;
  }

  JsonArray networks = doc["networks"].as<JsonArray>();
  if (!networks)
  {
    server.send(200, "application/json", "{\"networks\":[]}");
    return;
  }

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void HandleDeleteNetwork(ESP8266WebServer &server)
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

  const char *ssidToDelete = doc["ssid"];

  if (!ssidToDelete)
  {
    server.send(400, "application/json", "{\"error\":\"Missing ssid\"}");
    return;
  }

  // Open known_networks.json in read mode
  File file = LittleFS.open("/known_networks.json", "r");
  if (!file)
  {
    DebugLog.println("Failed to open known_networks.json");
    server.send(500, "application/json", "{\"error\":\"Failed to open known_networks.json\"}");
    return;
  }

  JsonDocument knownNetworksDoc;
  DeserializationError readError = deserializeJson(knownNetworksDoc, file);
  file.close();

  if (readError)
  {
    DebugLog.print("Failed to parse known_networks.json: ");
    DebugLog.println(readError.c_str());
    server.send(500, "application/json", "{\"error\":\"Failed to parse known_networks.json\"}");
    return;
  }

  JsonArray networks = knownNetworksDoc["networks"].as<JsonArray>();
  bool found = false;

  for (size_t i = 0; i < networks.size(); i++)
  {
    if (networks[i]["ssid"] == ssidToDelete)
    {
      networks.remove(i);
      found = true;
      break;
    }
  }

  if (!found)
  {
    server.send(404, "application/json", "{\"error\":\"Network not found\"}");
    return;
  }

  // Save updated known_networks.json
  file = LittleFS.open("/known_networks.json", "w");
  if (!file)
  {
    DebugLog.println("Failed to open known_networks.json for writing");
    server.send(500, "application/json", "{\"error\":\"Failed to save updated networks\"}");
    return;
  }

  serializeJson(knownNetworksDoc, file);
  file.close();

  server.send(200, "application/json", "{\"status\":\"Network deleted successfully\"}");
}

void HandleCreateNetwork(ESP8266WebServer &server)
{
  String body = server.arg("plain");

  JsonDocument requestDoc;
  DeserializationError error = deserializeJson(requestDoc, body);

  if (error)
  {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  const char *ssid = requestDoc["ssid"];
  const char *password = requestDoc["password"];

  if (!ssid || !password)
  {
    server.send(400, "application/json", "{\"error\":\"Missing ssid or password\"}");
    return;
  }

  // Larger buffer to avoid NoMemory errors as file grows
  JsonDocument knownDoc;

  File file = LittleFS.open("/known_networks.json", "r");

  if (file)
  {
    if (file.size() > 0)
    {
      DeserializationError readError = deserializeJson(knownDoc, file);
      if (readError)
      {
        file.close();
        server.send(500, "application/json", "{\"error\":\"Corrupted known_networks.json\"}");
        return;
      }
    }
    file.close();
  }

  // Ensure networks array exists
  JsonArray networks;

  if (!knownDoc.containsKey("networks"))
  {
    networks = knownDoc["networks"].to<JsonArray>();
  }
  else
  {
    networks = knownDoc["networks"].as<JsonArray>();
    if (networks.isNull())
    {
      networks = knownDoc["networks"].to<JsonArray>();
    }
  }

  // Check for duplicate SSID
  for (JsonObject network : networks)
  {
    if (strcmp(network["ssid"] | "", ssid) == 0)
    {
      server.send(409, "application/json", "{\"error\":\"Network already exists\"}");
      return;
    }
  }

  // Append new network
  JsonObject newNetwork = networks.createNestedObject();
  newNetwork["ssid"] = ssid;
  newNetwork["password"] = password;

  // Write entire updated document back to file
  file = LittleFS.open("/known_networks.json", "w");
  if (!file)
  {
    server.send(500, "application/json", "{\"error\":\"Failed to open file for writing\"}");
    return;
  }

  if (serializeJson(knownDoc, file) == 0)
  {
    file.close();
    server.send(500, "application/json", "{\"error\":\"Failed to write file\"}");
    return;
  }

  file.close();

  server.send(201, "application/json", "{\"status\":\"Network added successfully\"}");
}

void SetupNetworkingRoutes()
{
  SetupRoute("/api/wifi-routes", HTTP_GET, HandleGetAvailableConnections);
  SetupRoute("/api/authenticate-wifi", HTTP_POST, HandleSetConnection);
  SetupRoute("/api/networks", HTTP_GET, HandleGetNetworks);
  SetupRoute("/api/networks", HTTP_DELETE, HandleDeleteNetwork);
  SetupRoute("/api/networks", HTTP_PUT, HandleCreateNetwork);
}