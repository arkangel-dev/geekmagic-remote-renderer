#include <ESP8266WebServer.h>
#include <server.h>
#include <LittleFS.h>
#include <debugging.h>

File uploadFile;
String uploadPath;
bool uploadSuccess = false;

void HandleUploadFile(ESP8266WebServer &server)
{
    HTTPUpload &upload = server.upload();

    if (upload.status == UPLOAD_FILE_START)
    {
        uploadSuccess = false;
        String filename = upload.filename;
        int slash = filename.lastIndexOf('/');
        if (slash >= 0)
            filename = filename.substring(slash + 1);

        uploadPath = "/assets/" + filename;
        uploadFile = LittleFS.open(uploadPath, "w");
        uploadSuccess = uploadFile;
        DebugLog.print(F("Opening file: "));
        DebugLog.println(uploadPath);
        if (!uploadSuccess)
        {
            DebugLog.print(F("Failed to open: "));
            DebugLog.println(uploadPath);
        }
    }
    else if (upload.status == UPLOAD_FILE_WRITE)
    {
        if (uploadFile)
            uploadSuccess = uploadFile.write(upload.buf, upload.currentSize) == upload.currentSize;
        DebugLog.print(F("Writing chunk: "));
        DebugLog.println(upload.currentSize);
    }
    else if (upload.status == UPLOAD_FILE_END)
    {
        if (uploadFile)
        {
            uploadFile.close();
            DebugLog.print(F("Upload complete: "));
            DebugLog.print(uploadPath);
            DebugLog.print(F(" ("));
            DebugLog.print(upload.totalSize);
            DebugLog.println(F(" bytes)"));
        }
        else
        {
            DebugLog.print(F("Upload failed: "));
            DebugLog.println(uploadPath);
        }
    }
    else if (upload.status == UPLOAD_FILE_ABORTED)
    {
        if (uploadFile)
            uploadFile.close();

        DebugLog.print(F("Upload aborted: "));
        DebugLog.println(uploadPath);
        LittleFS.remove(uploadPath);
        uploadSuccess = false;
    }
}

void HandleUploadComplete(ESP8266WebServer &server)
{
    if (uploadSuccess)
        server.send(200, "application/json", "{\"success\":true}");
    else
        server.send(500, "application/json", "{\"success\":false}");
}

bool WipeAssetsDirectory()
{
    DebugLog.println(F("Wiping assets directory..."));
    while (true)
    {
        File root = LittleFS.open("/assets", "r");
        if (!root || !root.isDirectory())
            return true;

        File file = root.openNextFile();
        if (!file)
        {
            root.close();
            return true;
        }

        String filePath = file.name();
        if (!filePath.startsWith("/"))
            filePath = "/assets/" + filePath;
        file.close();
        root.close();

        if (!LittleFS.remove(filePath))
        {
            DebugLog.print(F("Failed to remove: "));
            DebugLog.println(filePath);
            return false;
        }
    }
    return true;
}

void HandleDeleteFile(ESP8266WebServer &server)
{
    // Get the filename from the query parameter
    String filename = server.arg("filename");
    if (filename.isEmpty())
    {
        if (WipeAssetsDirectory())
            server.send(200, "application/json", "{\"success\":true}");
        else
            server.send(500, "application/json", "{\"success\":false}");
        return;
    }

    // If there is no filename provided, 
    // wipe the entire assets directory if no filename is provided

    String filePath = "/assets/" + filename;

    if (LittleFS.exists(filePath))
    {
        LittleFS.remove(filePath);
        server.send(200, "application/json", "{\"success\":true}");
    }
    else
    {
        server.send(404, "application/json", "{\"success\":false,\"error\":\"File not found\"}");
    }
}

void HandleListFiles(ESP8266WebServer &server)
{
    String response = "[";
    File root = LittleFS.open("/assets", "r");

    if (!root || !root.isDirectory())
    {
        server.send(200, "application/json", "[]");
        return;
    }

    File file = root.openNextFile();
    bool first = true;

    while (file)
    {
        if (!first)
            response += ",";

        response += "{\"name\":\"";
        response += file.name();
        response += "\",\"size\":";
        response += String(file.size());
        response += "}";

        first = false;
        file = root.openNextFile();
    }
    response += "]";
    server.send(200, "application/json", response);
}

void SetupFileManagementRoutes()
{
    SetupUploadRoute("/api/files", HandleUploadComplete, HandleUploadFile);
    SetupRoute("/api/files", HTTP_DELETE, HandleDeleteFile);
    SetupRoute("/api/files", HTTP_GET, HandleListFiles);
}