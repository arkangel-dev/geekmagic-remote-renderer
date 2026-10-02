#include <TFT_eSPI.h>

// Declare tft as extern to avoid multiple definitions
extern TFT_eSPI tft;

void InitDisplay();
void ClearScreen();
void SetBrightness(int brightness);

extern bool DisplayReady;