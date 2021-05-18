#define _CRT_SECURE_NO_WARNINGS
#include <iostream>
#include <array>
#include <regex>
#include <string>
#include <vector>
#include <map>
#include "version.h"
#include "utils.h"
#include "main.h"
#include "watcher/watcher.h"


using std::string;

/*
 * Main function.
 */
int main(int argc, char* argv[])
{
    // store command line
    process_argc = argc;
    process_argv = argv;

#ifdef _PLATFORM_WIN
    // Set console code page to UTF-8 so console knows how to interpret string data
    SetConsoleCP(CP_UTF8); 
    SetConsoleOutputCP(CP_UTF8);
#endif

    // parse command line args
    if (hasCmdlineParam("--manifest-ff")) {
        // print out manifest content and exit
        std::cout << getManifestContent() << std::endl;
        return 0;
    }
    else if (hasCmdlineParam("-v") || hasCmdlineParam("--version")) {
        // print out manifest content and exit
        std::cout << APP_VERSION << std::endl;
        return 0;
    }

    // on some systems you may need to reopen stdin in binary mode
    // this is supposed to be reasonably portable
    freopen(nullptr, "rb", stdin);

    // watcher collection, keyed by ruleId
    std::map<string, watcher*> watchers;

    // start infinite reading loop
    while (true)
    {
        Json request = readRequest();
        if (request["msgId"].is_null()) {
            continue;
        }
        string msgId = request["msgId"].string_value();

        if (msgId == "version") {
            // prepare response
            sendResponse({
                { "msgId", "version", },
                { "version", APP_VERSION, },
                { "executable", process_argc > 0 ? getBinaryFilename() : "...undefined...", },
                { "protocolVersion", PROTOCOL_VERSION, },
            });
        }

        else if (msgId == "start") {
            string ruleId = request["ruleId"].string_value();
            string directory = request["directory"].string_value();
            string includePattern = request["includePattern"].string_value();
            string excludePattern = request["excludePattern"].is_null() ? "" : request["excludePattern"].string_value();

            // search an existing watcher for the given ruleId
            if (watchers.find(ruleId) == watchers.end()) {
                // create a new watcher
                watchers[ruleId] = new watcher(ruleId, directory, includePattern, excludePattern);
                Log("Started a new watcher for rule '%s'", ruleId.c_str());
            }
            else {
                // increment usage of the existing watcher
                watchers[ruleId]->usage++;
                Log("Watcher for rule '%s' already exists (usage = %d)", ruleId.c_str(), watchers[ruleId]->usage);
            }
        }

        else if (msgId == "stop") {
            string ruleId = request["ruleId"].string_value();
            // search an existing watcher for the given ruleId
            if (watchers.find(ruleId) != watchers.end()) {
                // decrement its usage and, if <= 0, destroy it
                if (--watchers[ruleId]->usage <= 0) {
                    delete watchers[ruleId];
                    watchers.erase(ruleId);
                    Log("Deleted watcher of rule '%s'", ruleId.c_str());
                }
                else {
                    Log("Decremented usage of rule '%s' to %d", ruleId.c_str(), watchers[ruleId]->usage);
                }
            }
        }

        else if (msgId == "stopAll") {
            // delete all existing watchers and clear collection
            for (auto w : watchers) {
                delete w.second;
            }
            watchers.clear();
            Log("Deleted all watchers");
        }

        else if (msgId == "directorySelect") {
            // open a native directory selector dialog
            string ruleId = request["ruleId"].string_value();
            if (ruleId.length()) {
                // initial directory (optional)
                string directory = request["directory"].string_value();
                // show dialog
                std::cerr << "Opening directory selector on " << directory << std::endl;
                directory = openFolderSelector(directory);
                if (directory.length()) {
                    // return a response
                    sendResponse({
                        { "msgId", "directorySelect", },
                        { "ruleId", ruleId.c_str(), },
                        { "directory", directory.c_str(), },
                    });
                }
            }
            // close process
            // this action is started (when needed) by WebExtension options page
            // in a dedicated (and separate) native-app instance
            return 0;

        } // if (switch)

    } // while
}


/*
 * Returns a Json object describing the received request.
 * NOTE: this call will block calling thread until a Json object is read from stdin.
 */
Json readRequest() {

    Json json;

    // read the first 4 bytes (message length) and convert them to UInt32
    unsigned int len = 0;
    do {
        std::cin.read((char*)&len, 4);
    } while (len == 0 || len > 65535); // exclude spurious read

    // read len bytes
    char *buf = new char[len + 1];
    std::cin.read(buf, len);
    buf[len] = '\0';
    //DebugBuffer("Input message", buf, len);

    // parse message to JSON object and cleanup
    string error;
    json = Json::parse(buf, error);
    delete[] buf;
    Log("Request: %s", json.dump().c_str());

    return json;
}


/*
 * Send a JSON response object to the browser.
 */
void sendResponse(Json::object &&values) {

    // create JSON object
    Json response = values;
    string responseBody = response.dump();
    unsigned int len = (unsigned int)responseBody.length();

    // send message len + body
    Log("Response: %s", responseBody.c_str());
    std::cout.write((char*)&len, 4);
    std::cout.write(responseBody.data(), len);
    std::cout.flush();
}
