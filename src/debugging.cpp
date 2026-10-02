#include "debugging.h"
#include <setup_display.h>

bool IsDisplayDebugEnabled = true;
DebugSerial::DebugSerial() : buffer("") {}

// Print methods
size_t DebugSerial::print(const char* str) {
    if (buffer.length() + strlen(str) > MAX_BUFFER_SIZE) {
      buffer = buffer.substring(buffer.length() - MAX_BUFFER_SIZE / 2);
    }
    buffer += str;
    if (IsDisplayDebugEnabled && DisplayReady) {
        tft.print(str);
    }
    Serial.print(str);
    return strlen(str);
}

size_t DebugSerial::print(char c) {
    if (buffer.length() >= MAX_BUFFER_SIZE) {
      buffer = buffer.substring(buffer.length() - MAX_BUFFER_SIZE / 2);
    }
    buffer += c;
    return 1;
}

size_t DebugSerial::print(int n, int base) {
    return print(String(n, base).c_str());
}

size_t DebugSerial::print(unsigned int n, int base) {
    return print(String(n, base).c_str());
}

size_t DebugSerial::print(long n, int base) {
    return print(String(n, base).c_str());
}

size_t DebugSerial::print(unsigned long n, int base) {
    return print(String(n, base).c_str());
}

size_t DebugSerial::print(double n, int digits) {
    return print(String(n, digits).c_str());
}

size_t DebugSerial::print(const String& s) {
    return print(s.c_str());
}

// Println methods
size_t DebugSerial::println() {
    return print("\n");
}

size_t DebugSerial::println(const char* str) {
    size_t n = print(str);
    n += println();
    return n;
}

size_t DebugSerial::println(char c) {
    size_t n = print(c);
    n += println();
    return n;
}

size_t DebugSerial::println(int n, int base) {
    size_t written = print(n, base);
    written += println();
    return written;
}

size_t DebugSerial::println(unsigned int n, int base) {
    size_t written = print(n, base);
    written += println();
    return written;
}

size_t DebugSerial::println(long n, int base) {
    size_t written = print(n, base);
    written += println();
    return written;
}

size_t DebugSerial::println(unsigned long n, int base) {
    size_t written = print(n, base);
    written += println();
    return written;
}

size_t DebugSerial::println(double n, int digits) {
    size_t written = print(n, digits);
    written += println();
    return written;
}

size_t DebugSerial::println(const String& s) {
    size_t written = print(s);
    written += println();
    return written;
}

// Get captured output
const String& DebugSerial::getBuffer() const {
    return buffer;
}

// Clear the buffer
void DebugSerial::clearBuffer() {
    buffer = "";
}

// Get last N lines
String DebugSerial::getLastLines(int numLines) const {
    int pos = buffer.length();
    int count = 0;
    
    while (pos > 0 && count < numLines) {
      pos = buffer.lastIndexOf('\n', pos - 1);
      if (pos == -1) break;
      count++;
    }
    
    return (pos == -1) ? buffer : buffer.substring(pos + 1);
}

DebugSerial DebugLog;