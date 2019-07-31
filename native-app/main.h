#pragma once
#include "json/json11.hpp"

using json11::Json;


/*
 * Main function.
 */
int main(int argc, char* argv[]);


/*
 * Returns a Json object describing the received request.
 */
Json readRequest();


/*
 * Send a JSON response object to the browser.
 */
void sendResponse(Json::object &&values);
