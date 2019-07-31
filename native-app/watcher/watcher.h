#pragma once
#include "../utils.h"
#include <regex>

// platform specific string define
#if defined WIN32
    #define _PLATFORM_WIN
    typedef std::wstring fwstring;
    typedef std::wregex  fwregex;
    typedef std::wcmatch fwcmatch;
#elif defined _PLATFORM_LINUX
    #include <pthread.h>
    typedef std::string fwstring;
    typedef std::regex  fwregex;
    typedef std::cmatch fwcmatch;
#endif
#include "filewatch.hpp"

class watcher
{
public:
    watcher(std::string ruleId, std::string path, std::string includeRegex, std::string excludeRegex);
    ~watcher();

    // number of "start" requests received by this watcher
    int usage = 1;

private:
    // ruleId this watcher is linked to
    std::string ruleId;

    // condition variable used for delay timer
    std::mutex mtx;
    std::condition_variable cv;

    // file watcher
    filewatch::FileWatch<fwstring> *fw = NULL;

    // filter regexes
    fwregex *includeRegex = NULL;
    fwregex *excludeRegex = NULL;

    // filewatcher changed callback
    void directoryChangedCallback(const fwstring& path, const filewatch::Event change_type);

    // reference to delay thread
    // if set, then a delay is armed
    std::thread *th = NULL;
};

