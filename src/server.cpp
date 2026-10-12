#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <setup_display.h>
#include <LittleFS.h>
#include "security.h"
#include <settings.h>
#include <debugging.h>
#include <wifi.h>
#include <http-services/networking.h>
#include <http-services/settings.h>
#include <http-services/security-service.h>
#include <http-services/state-query.h>
#include <http-services/display-management.h>
#include <http-services/device-management.h>
#include <http-services/content-renderer.h>
#include <http-services/file-management.h>
#include "server.h"

WebSocketsServer webSocket(81);
ESP8266WebServer server(80);

bool IsInRecoveryMode = false;
String CurrentToken = "";

void SetCorsHeaders()
{
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

void HandleCorsPreflight()
{
  SetCorsHeaders();
  server.send(204);
}

void HandleWebServer(ESP8266WebServer &server)
{
  String path = server.uri();
  DebugLog.print("Requested path: ");
  DebugLog.println(path);

  // If root is requested, serve index.html
  if (path == "/")
  {
    path = "/index.html";
  }

  // Prepend /dist to the path
  String filePath = "/dist" + path;
  DebugLog.print("Serving file: ");
  DebugLog.println(filePath);

  // Check if file exists
  if (!LittleFS.exists(filePath))
  {
    DebugLog.println("File not found");
    server.send(404, "text/plain", "File Not Found");
    return;
  }

  // Determine content type based on file extension
  String contentType = "text/plain";
  if (path.endsWith(".html"))
  {
    contentType = "text/html";
  }
  else if (path.endsWith(".css"))
  {
    contentType = "text/css";
  }
  else if (path.endsWith(".js"))
  {
    contentType = "application/javascript";
  }
  else if (path.endsWith(".json"))
  {
    contentType = "application/json";
  }
  else if (path.endsWith(".png"))
  {
    contentType = "image/png";
  }
  else if (path.endsWith(".jpg") || path.endsWith(".jpeg"))
  {
    contentType = "image/jpeg";
  }
  else if (path.endsWith(".gif"))
  {
    contentType = "image/gif";
  }
  else if (path.endsWith(".ico"))
  {
    contentType = "image/x-icon";
  }

  // Open and serve the file
  File file = LittleFS.open(filePath, "r");
  if (!file)
  {
    server.send(500, "text/plain", "Failed to open file");
    return;
  }

  server.streamFile(file, contentType);
  file.close();
}

void SetupRoute(const char *uri, HTTPMethod method, std::function<void(ESP8266WebServer &)> handler)
{
  server.on(
      uri,
      method,
      [handler]()
      {
        SetCorsHeaders();
        handler(server);
      });
  server.on(uri, HTTP_OPTIONS, HandleCorsPreflight);
}

void SetupUploadRoute(const char *uri, std::function<void(ESP8266WebServer &)> handler, std::function<void(ESP8266WebServer &)> uploadHandler)
{
  server.on(
      uri,
      HTTP_POST,
      [handler]()
      {
        SetCorsHeaders();
        handler(server);
      },
      [uploadHandler]()
      {
        SetCorsHeaders();
        uploadHandler(server);
      });
  server.on(uri, HTTP_OPTIONS, HandleCorsPreflight);
}

struct WebsocketMessageLine
{
  uint8_t parameterType;
  uint8_t *parameterValue;
  size_t parameterLength;
};

/**
 * Send out standard message to the client with an operation code
 * and multiple message lines. Each message line can have a type,
 * value and value length.
 */
void SendWebsocketMessage(std::uint8_t operation, WebsocketMessageLine *messageLines, std::uint8_t messageLineCount)
{
  size_t payloadLength = 5;
  for (uint8_t i = 0; i < messageLineCount; i++)
  {
    if (messageLines[i].parameterLength > 65535)
      return;
    payloadLength += 3 + messageLines[i].parameterLength;
  }

  std::vector<uint8_t> payload;
  payload.reserve(payloadLength);
  payload.push_back('G');
  payload.push_back('M');
  payload.push_back('P');
  payload.push_back(operation);
  payload.push_back(messageLineCount);

  for (uint8_t i = 0; i < messageLineCount; i++)
  {
    const WebsocketMessageLine &line = messageLines[i];
    payload.push_back(line.parameterType);
    payload.push_back(line.parameterLength & 0xFF);
    payload.push_back((line.parameterLength >> 8) & 0xFF);

    if (line.parameterLength > 0)
      payload.insert(
          payload.end(),
          line.parameterValue,
          line.parameterValue + line.parameterLength);
  }

  webSocket.broadcastBIN(payload.data(), payload.size());
}

void WebSocketEvent(
    uint8_t client,
    WStype_t type,
    uint8_t *payload,
    size_t length)
{
  switch (type)
  {
  case WStype_CONNECTED:
    DebugLog.print(F("WebSocket client connected: "));
    DebugLog.println(client);
    break;

  case WStype_DISCONNECTED:
    DebugLog.print(F("WebSocket client disconnected: "));
    DebugLog.println(client);
    break;

  case WStype_BIN:
    DebugLog.print(F("Heap before RenderContent: "));
    DebugLog.println(ESP.getFreeHeap());
    if (!RenderContent(payload, length))
    {
      DebugLog.println(F("WebSocket: invalid render packet"));

      webSocket.sendTXT(
          client,
          "Invalid render packet");

      return;
    }
    DebugLog.print(F("Heap after RenderContent: "));
    DebugLog.println(ESP.getFreeHeap());
    webSocket.sendTXT(client, "OK");
    break;

  default:
    break;
  }
}

/**
 * Setup the HTTP server
 */
void SetupServer()
{
  SetupRoute("/", HTTP_GET, HandleWebServer);
  SetupDisplayManagementRoutes();
  SetupNetworkingRoutes();
  SetupStateQueryRoutes();
  SetupSettingsRoutes();
  SetupDeviceManagementRoutes();
  SetupSecurityServiceRoutes();
  SetupFileManagementRoutes();

  server.onNotFound([]()
                    { HandleWebServer(server); });

  server.begin();
  webSocket.begin();
  webSocket.onEvent(WebSocketEvent);
  DebugLog.println("Webserver ready...");
}
