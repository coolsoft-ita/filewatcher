#pragma once

// platform specific defines
#ifdef WIN32
    #define _PLATFORM_WIN
#endif
#ifdef __unix__
    #define _PLATFORM_LINUX
#endif

// reference to command line params
extern char** process_argv;
extern int    process_argc;


// Log message to STDERR.
// NOTE: We must use STDERR to not interfere with browser STDIN linked to our STDOUT.
//       STDERR content can be seen with browser console (CTRL+SHIFT+J on Firefox).
void Log(const char* format, ...);


// Log error message to STDERR.
// NOTE: We must use STDERR to not interfere with browser STDIN linked to our STDOUT.
//       STDERR content can be seen with browser console (CTRL+SHIFT+J on Firefox).
void LogError(const char* format, ...);


/*
 * Print buffer content in a readable way
 */
void DebugBuffer(const char* message, const char* buffer, size_t bufferLen);


/*
 * Return executable filename.
 */
std::string getBinaryFilename();


/*
 * Return true if the given comand line parameter exists.
 */
bool hasCmdlineParam(const char* search);


/**
 * Returns the base webextension manifest content
 */
std::string getManifestContent();


/**
 * Open a native directory selector
 */
std::string openFolderSelector(std::string initialDirectory);


#if defined _PLATFORM_WIN
    /**
     * Convert a string to wstring
     */
    std::wstring string2wstring(const std::string &in);
    /**
     * Convert a wstring to string
     */
    std::string wstring2string(const std::wstring &in);
    std::string wstring2string(const wchar_t* in);
#endif