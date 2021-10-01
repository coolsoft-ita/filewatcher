#include <stdarg.h>
#include <iostream>
#include "utils.h"
#include "version.h"
#include "main.h"
#include "dialogs/tinyfiledialogs.h"


#if defined _PLATFORM_WIN
    #include <Windows.h>
    #include <codecvt>
#elif defined _PLATFORM_LINUX
    #include <libgen.h>
#endif

// reference to command line params
char** process_argv;
int    process_argc = 0;


/*
 * Print buffer content in a readable way
 */
void DebugBuffer(const char* message, const char* buffer, size_t bufferLen) {

    // print chars
    std::cerr << message << " (len:" << bufferLen << "): ";
    std::cerr << buffer << std::endl;

    // print hex
    for (size_t i = 0; i < bufferLen; ++i) {
        std::cerr << std::uppercase << std::hex << (int)buffer[i] << " ";
    }
    std::cerr << std::dec << std::endl;

}


// Log message to STDERR.
// NOTE: We must use STDERR to not interfere with browser STDIN linked to our STDOUT.
//       STDERR content can be seen with browser console (CTRL+SHIFT+J on Firefox).
void Log(const char* format, ...)
{
    int res = 0;
    int n = ((int)strlen(format)) * 2; /* Reserve two times as much as the length of format */
    std::unique_ptr<char[]> formatted;

    va_list va;
    while (true) {
        formatted.reset(new char[n]); /* Wrap a plain char array into the unique_ptr */
        va_start(va, format);
        res = vsnprintf(&formatted[0], n, format, va);
        va_end(va);
        if (res >= n)
            n = res + 1;
        else
            break;
    }
    std::cerr << formatted.get() << std::endl;
}


// Log error message to STDERR.
void LogError(const char* format, ...)
{
    std::cerr << "[ERROR] ";
    va_list va;
    va_start(va, format);
    Log(format, va);
    va_end(va);
}


/*
 * Return executable filename.
 */
std::string getBinaryFilename()
{
#if defined _PLATFORM_WIN

    wchar_t buf[MAX_PATH];
    GetModuleFileName(NULL, buf, MAX_PATH);
    return wstring2string(buf);

#elif defined _PLATFORM_LINUX

    char *path = realpath(process_argv[0], NULL);
    std::string res(path);
    free(path);
    return res;

#endif
}


/*
 * Return true if the given comand line parameter exists.
 */
bool hasCmdlineParam(const char* search)
{
    for (int i = 0; i < process_argc; ++i) {
        if (strcmp(search, process_argv[i]) == 0) return true;
    }
    return false;
}


/**
 * Returns webextension manifest content (to be used by installers)
 */
std::string getManifestContent()
{
    json11::Json res({
        { "name", APP_NAME, },
        { "description", "Native client for FileWatcher browser webextension", },
        { "path", getBinaryFilename().c_str(), },
        { "type", "stdio", },
        { "allowed_extensions", json11::Json::array { EXTENSION_ID }, },
        });
    //std::string out = res.dump();
    return res.dump();
}


std::string openFolderSelector(std::string initialDirectory)
{
#if defined _PLATFORM_WIN
    // need to call the "W" version, otherwise directory preselection won't work
    const wchar_t* res = tinyfd_selectFolderDialogW(
        L"Select base directory to watch", 
        string2wstring(initialDirectory).c_str()
    );
    return wstring2string(res);
#else
    return tinyfd_selectFolderDialog("Select folder", initialDirectory.c_str());
#endif
}


#if defined _PLATFORM_WIN
/**
 * Convert a string to wstring
 */
std::wstring string2wstring(const std::string &in)
{
    using convert_typeX = std::codecvt_utf8<wchar_t>;
    std::wstring_convert<convert_typeX, wchar_t> converterX;
    return converterX.from_bytes(in);
}
/**
 * Convert a wstring to string
 */
std::string wstring2string(const std::wstring &in)
{
    using convert_typeX = std::codecvt_utf8<wchar_t>;
    std::wstring_convert<convert_typeX, wchar_t> converterX;
    return converterX.to_bytes(in);
}
/**
 * Convert a wstring to string
 */
std::string wstring2string(const wchar_t* in)
{
    using convert_typeX = std::codecvt_utf8<wchar_t>;
    std::wstring_convert<convert_typeX, wchar_t> converterX;
    return converterX.to_bytes(in);
}
#endif