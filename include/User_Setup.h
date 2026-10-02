#define ST7789_DRIVER

#define TFT_WIDTH  240
#define TFT_HEIGHT 240

// SPI pins (ESP-12F)
#define TFT_MOSI 13
#define TFT_SCLK 14

// Control pins
#define TFT_CS   -1      // CS tied to GND
#define TFT_DC    0      // GPIO0
#define TFT_RST   2      // GPIO2

// SPI speed (safe)
#define SPI_FREQUENCY  8000000

#define LOAD_FONT1   // default 8x16
#define LOAD_FONT2   // small 16px
#define LOAD_FONT4   // large 26px

#define SMOOTH_FONT  // enables loadFont() / .vlw smooth font support
