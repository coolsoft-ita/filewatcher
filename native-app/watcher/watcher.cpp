#include <thread>
#include <chrono>
#include "watcher.h"
#include "../main.h"


#define NOTIFY_DELAY 1000
#ifdef _WIN32
    #define NATIVE_STRING(x)  string2wstring(x)
    #define FORCE_STRING(x)   wstring2string(x)
#else
    #define NATIVE_STRING(x)  x
    #define FORCE_STRING(x)   x
#endif

using std::cv_status;
using std::mutex;
using std::thread;
using std::unique_lock;
using std::chrono::milliseconds;


watcher::watcher(std::string ruleId, std::string path, std::string includePattern, std::string excludePattern)
{
    // store ruleId reference
    this->ruleId = ruleId;

    // init regular expressions
    if (includePattern.length()) {
        this->includeRegex = new fwregex(NATIVE_STRING(includePattern), fwregex::optimize);
    }
    if (excludePattern.length()) {
        this->excludeRegex = new fwregex(NATIVE_STRING(excludePattern), fwregex::optimize);
    }

    // init file watcher
    fw = new filewatch::FileWatch<fwstring>(
        NATIVE_STRING(path),
        // callback function called on file changes
        [this](const fwstring& path, const filewatch::Event change_type) {
            this->directoryChangedCallback(path, change_type); 
        }
    );
}


watcher::~watcher()
{
    if (includeRegex) delete includeRegex;
    if (excludeRegex) delete excludeRegex;
    if (th) delete th;
    delete fw;
}


/**
 * filewatcher changed callback
 */
void watcher::directoryChangedCallback(const fwstring &path, const filewatch::Event change_type)
{
    // changed file must NOT match excludeRegex (if defined)
    fwcmatch m;
    if (excludeRegex && std::regex_search(path.c_str(), m, *excludeRegex)) {
        //Log("Changed file '%s' excluded by excludePattern", FORCE_STRING(path).c_str());
        return;
    }

    // changed file must match includeRegex
    if (includeRegex && !std::regex_search(path.c_str(), m, *includeRegex)) {
        //Log("Changed file '%s' not included by includePattern", FORCE_STRING(path).c_str());
        return;
    }

    // if a delay thread is not running start a new one
    if (!th) {

        // start a new delay thread and detach from it
        th = new thread([=]() {

            // wait NOTIFY_DELAY ms before sending the reload message
            do {
                // wait for NOTIFY_DELAY ms; if any further file change callback comes in
                // while waiting, then wait_for() returns != std::cv_status::timeout
                // and we'll wait again
                unique_lock<mutex> lock(mtx);
                if (cv.wait_for(lock, milliseconds(NOTIFY_DELAY)) == cv_status::timeout) {

                    // NOTIFY_DELAY timeout has passed without any further file change callback
                    // send "reload" message to webextension
                    sendResponse({
                        { "msgId", "reload", },
                        { "ruleId", this->ruleId.c_str() },
                    });

                    // allow another thread to be started
                    delete th;
                    th = NULL;
                }
            } while (th);


        });

        // detach from the running thread
        th->detach();

    }
    // a delay thread is already running, notify it to reset its delay timer
    else {
        //Log("A change notify is already waiting to be sent...");
        cv.notify_all();
    }
}
