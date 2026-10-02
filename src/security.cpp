#include <ArduinoJson.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define TOKEN_VALIDITY_SECONDS 1800 // 30 minutes
#define TOKEN_LENGTH 32

struct TokenEntry {
    char token[TOKEN_LENGTH + 1];
    time_t last_validated;
};

static TokenEntry g_token = {"", 0};

void generateRandomToken(char* buffer, size_t length) {
    const char charset[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (size_t i = 0; i < length; i++) {
        int key = rand() % (sizeof(charset) - 1);
        buffer[i] = charset[key];
    }
    buffer[length] = '\0';
}

// Returns true and writes the token to outToken if successful, false otherwise
bool GetNewToken(char* outToken, size_t outTokenLen) {
    if (outTokenLen < TOKEN_LENGTH + 1) return false;
    generateRandomToken(g_token.token, TOKEN_LENGTH);
    g_token.last_validated = time(nullptr);
    strncpy(outToken, g_token.token, TOKEN_LENGTH + 1);
    return true;
}

// Returns true if token is valid, false otherwise
bool VerifyToken(const char* token) {
    time_t now = time(nullptr);
    if (strncmp(token, g_token.token, TOKEN_LENGTH) != 0) return false;
    if ((now - g_token.last_validated) > TOKEN_VALIDITY_SECONDS) {
        g_token.token[0] = '\0';
        g_token.last_validated = 0;
        return false;
    }
    g_token.last_validated = now;
    return true;
}