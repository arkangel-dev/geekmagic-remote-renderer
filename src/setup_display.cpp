#include <TFT_eSPI.h>
#include <vector>
#include <string>
#include <TJpg_Decoder.h>
#include <settings.h>
#include "setup_display.h"
#include <rendering/renderer-runtime.h>
#include <rendering/renderer-constants.h>
#include <debugging.h>

#define BL_PIN 5 // Backlight pin

TFT_eSPI tft = TFT_eSPI();

bool DisplayReady = false;

void SetBrightness(int);
void DisplayImage();

void InitDisplay()
{
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_BLACK);
  tft.setTextFont(2); // Built-in font
  tft.setTextSize(0.5);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  JsonDocument settings = GetSettings();
  int SavedBrightness = settings["brightness"];
  SetBrightness(SavedBrightness);
  DisplayReady = true;
}

void SetBrightness(int brightness)
{
  pinMode(BL_PIN, OUTPUT);
  analogWriteRange(1023);
  analogWrite(BL_PIN, brightness);
}

void ClearScreen()
{
  tft.fillScreen(TFT_BLACK);
}