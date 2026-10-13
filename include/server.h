#pragma once

#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>

struct WebsocketMessageLine
{
  uint8_t parameterType;
  uint8_t *parameterValue;
  size_t parameterLength;
};

void SetupRoute(const char *uri, HTTPMethod method, std::function<void(ESP8266WebServer &)> handler);
void SetupUploadRoute(const char *uri, std::function<void(ESP8266WebServer &)> handler, std::function<void(ESP8266WebServer &)> uploadHandler);
void SendWebsocketMessage(std::uint8_t operation, WebsocketMessageLine *messageLines, std::uint8_t messageLineCount);
void SetupServer();

extern ESP8266WebServer server;
extern WebSocketsServer webSocket;
extern bool IsInRecoveryMode;
extern String CurrentToken;