#include <LittleFS.h>
#include <ArduinoJson.h>
#include "settings.h"
#include <debugging.h>

JsonDocument CreateDefaultSettings()
{
    // Create a default settings JSON object
    JsonDocument doc;
    doc["timezone"] = 300;
    doc["brightness"] = 128;
    doc["seconds_enabled"] = true;

    // Write the default settings to LittleFS
    File file = LittleFS.open("/settings.json", "w");
    if (!file)
    {
        DebugLog.println("Failed to create default settings.json");
    }
    serializeJson(doc, file);
    file.close();
    return doc;
}


JsonDocument _currentSettings;
JsonDocument GetSettings()
{
    if (!_currentSettings.isNull())
    {
        return _currentSettings;
    }

    // Read settings from LittleFS
    // Parse it as JSON and return the JSON object
    File file = LittleFS.open("/settings.json", "r");
    if (!file)
    {
        DebugLog.println("Failed to open settings.json");
        // Create a default settings file if it doesn't exist
        return CreateDefaultSettings();
    }

    DeserializationError error = deserializeJson(_currentSettings, file);
    file.close();
    if (error)
    {
        DebugLog.println("Failed to parse settings.json, creating default settings");
        // Create a default settings file if parsing fails
        return CreateDefaultSettings();
    }
    return _currentSettings;
}

void SetSettings(JsonDocument settings)
{
    _currentSettings = settings;
    // Write the provided settings JSON object to LittleFS
    File file = LittleFS.open("/settings.json", "w");
    if (!file)
    {
        DebugLog.println("Failed to open settings.json for writing");
        return;
    }
    serializeJson(settings, file);
    file.close();
}