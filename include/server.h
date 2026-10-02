#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>

void SetupRoute(const char *uri, HTTPMethod method, std::function<void(ESP8266WebServer &)> handler);
void SetupUploadRoute(const char *uri, std::function<void(ESP8266WebServer &)> handler, std::function<void(ESP8266WebServer &)> uploadHandler);

void SetupServer();

extern ESP8266WebServer server;
extern WebSocketsServer webSocket;
extern bool IsInRecoveryMode;
extern String CurrentToken;