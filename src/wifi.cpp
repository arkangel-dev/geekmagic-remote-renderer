#include "setup_display.h"
#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <qrcode.h>
#include <debugging.h>

const int MAX_CONNECTION_ATTEMPTS = 20;

String generateRandomString(int length)
{
  String charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  String result = "";
  for (int i = 0; i < length; i++)
  {
    result += charset[random(0, charset.length())];
  }
  return result;
}

bool tryConnectToKnownNetwork()
{
  DebugLog.println("Searching for known networks...");

  // Check if known_networks.json exists
  if (!LittleFS.exists("/known_networks.json"))
  {
    DebugLog.println("known_networks.json not found");
    return false;
  }

  // Read and parse known networks
  File file = LittleFS.open("/known_networks.json", "r");
  if (!file)
  {
    DebugLog.println("Failed to open known_networks.json");
    return false;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, file);
  file.close();

  if (error)
  {
    DebugLog.print("JSON parse failed: ");
    DebugLog.println(error.c_str());
    return false;
  }

  // Scan for available networks
  int numNetworks = WiFi.scanNetworks();
  DebugLog.print("Networks found: ");
  DebugLog.println(numNetworks);

  // Try to connect to known networks
  JsonArray networks = doc["networks"].as<JsonArray>();
  for (JsonObject network : networks)
  {
    const char *knownSsid = network["ssid"];
    const char *knownPassword = network["password"];

    // Check if this known network is available
    for (int i = 0; i < numNetworks; i++)
    {
      if (WiFi.SSID(i) == knownSsid)
      {
        DebugLog.print("Found known network: ");
        DebugLog.println(knownSsid);
        DebugLog.println(("Connecting to: " + String(knownSsid)).c_str());

        WiFi.mode(WIFI_STA);
        WiFi.begin(knownSsid, knownPassword);

        int attempt = 0;
        while (WiFi.status() != WL_CONNECTED && attempt < MAX_CONNECTION_ATTEMPTS)
        {
          delay(500);
          attempt++;
        }
        DebugLog.println();

        if (WiFi.status() == WL_CONNECTED)
        {
          DebugLog.println("Connected successfully!");
          return true;
        }
        else
        {
          DebugLog.println("Connection failed: " + String(WiFi.status()));
          WiFi.disconnect();
        }
      }
    }
  }

  return false;
}

void displayQRCode(String ssid, String password)
{
  // Create QR code data in WiFi format
  String qrData = "WIFI:T:WPA;S:" + ssid + ";P:" + password + ";;";

  // Create QR code
  QRCode qrcode;
  uint8_t qrcodeData[qrcode_getBufferSize(3)];
  qrcode_initText(&qrcode, qrcodeData, 3, ECC_LOW, qrData.c_str());

  // Calculate QR code display parameters to fill 240x240 screen
  int scale = 125 / qrcode.size; // Scale to fill screen (240/29 = 8)
  int qrWidth = qrcode.size * scale;
  int offsetX = (240 - qrWidth) / 2;
  int offsetY = (240 - qrWidth) / 2;

  // Draw QR code with inverted colors (white modules on black background)
  for (uint8_t y = 0; y < qrcode.size; y++)
  {
    for (uint8_t x = 0; x < qrcode.size; x++)
    {
      int color = qrcode_getModule(&qrcode, x, y) ? TFT_WHITE : TFT_BLACK;
      tft.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale, color);
    }
  }
  DebugLog.println("QR Code displayed");
}

void startRecoveryMode()
{
  DebugLog.println("Entering recovery mode...");
  DebugLog.println("Starting recovery AP mode");

  // Generate random network name and password
  String apName = generateRandomString(16);
  String apPassword = generateRandomString(16);

  // Set up Access Point
  WiFi.mode(WIFI_AP);

  // Configure custom IP address for AP
  IPAddress local_IP(192, 168, 100, 1);
  IPAddress gateway(192, 168, 100, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_IP, gateway, subnet);

  WiFi.softAP(apName.c_str(), apPassword.c_str());

  // Display QR code (fills screen with black background and white QR code)
  IsDisplayDebugEnabled = false;
  tft.fillScreen(TFT_BLACK);
  displayQRCode(apName, apPassword);

  DebugLog.println("Recovery AP Details:");
  DebugLog.print("SSID: ");
  DebugLog.println(apName);
  DebugLog.print("Password: ");
  DebugLog.println(apPassword);
  DebugLog.print("IP: ");
  DebugLog.println(WiFi.softAPIP().toString());
}

bool SetupWifi()
{
  DebugLog.println("Initializing WiFi...");

  // Try to connect to a known network
  if (tryConnectToKnownNetwork())
  {
    DebugLog.println("WiFi Connected!");
    tft.setTextColor(TFT_GREEN, TFT_BLACK);
    DebugLog.println(("IP: " + WiFi.localIP().toString()).c_str());
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    return true;
  }
  else
  {
    // No known network found, enter recovery mode
    startRecoveryMode();
    return false;
  }
}