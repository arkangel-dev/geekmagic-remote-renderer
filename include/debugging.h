#ifndef DEBUGGING_H
#define DEBUGGING_H

#include <Arduino.h>
#include <WString.h>

extern bool IsDisplayDebugEnabled; 
class DebugSerial {
private:
  String buffer;
  static const size_t MAX_BUFFER_SIZE = 128;

public:
  DebugSerial();

  // Print methods
  size_t print(const char* str);
  size_t print(char c);
  size_t print(int n, int base = DEC);
  size_t print(unsigned int n, int base = DEC);
  size_t print(long n, int base = DEC);
  size_t print(unsigned long n, int base = DEC);
  size_t print(double n, int digits = 2);
  size_t print(const String& s);

  // Println methods
  size_t println();
  size_t println(const char* str);
  size_t println(char c);
  size_t println(int n, int base = DEC);
  size_t println(unsigned int n, int base = DEC);
  size_t println(long n, int base = DEC);
  size_t println(unsigned long n, int base = DEC);
  size_t println(double n, int digits = 2);
  size_t println(const String& s);

  // Get captured output
  const String& getBuffer() const;

  // Clear the buffer
  void clearBuffer();

  // Get last N lines
  String getLastLines(int numLines) const;
};

extern DebugSerial DebugLog;

#endif
