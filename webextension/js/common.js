/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


// Default watched file extensions
const DEFAULT_EXT_PATTERN = "\\.(html?|css|js|twig|php)$";


/**
 * Show a notification message to the user
 * @param {string} message
 * @returns {undefined}
 */
function ShowNotification(message, title = '', id = '') {
    chrome.notifications.create(id, {
        "type": "basic",
        "iconUrl": chrome.extension.getURL("icons/icon-128.png"),
        "title": title ? title : "FileWatcher",
        "message": message
    });
}


/**
 * Show an error received from the native app.
 */
function ShowNativeError(message) {
    ShowNotification(
        message,
        "FileWatcher - Native app error",
        'filewatcher-native-error'
    );
}


/**
 * Open the extension help webpage.
 */
function OpenHelpWindow() {
    var helpUrl = "http://coolsoft.altervista.org/filewatcher#config";
    browser.tabs.create({ url: helpUrl });
}


/****************************************
 * Rules
 ****************************************/
/**
 * @classdesc Rule definition
 * @class
 */
function Rule(urlPattern = '', directory = '', includePattern = DEFAULT_EXT_PATTERN, excludePattern = '') {

    /**
     * Is this rule enabled?
     * @type {boolean}
     */
    this.enabled = true;

    /**
     * Regular expression for URL matching
     * @type {string}
     */
    this.urlPattern = urlPattern;

    /**
     * Local filesystem path to watch for changes
     * @type {string}
     */
    this.directory = directory;

    /**
     * Regular expression for file matching
     * (passed as a filter to native application)
     * @type {string}
     */
    this.includePattern = includePattern;

    /**
     * Regular expression for file exclusion
     * (passed as a filter to native application)
     * @type {string}
     */
    this.excludePattern = excludePattern;

    /**
    * Validate the rule.
    * Returns true if the rule is valid, otherwise returns an object
    * fields error descriptions keyed by field name:
    * { "urlPattern": "Can't be empty" }
    *
    * @returns {array}
    */
    this.Validate = function() {
        var errors = {};
        if (!this.urlPattern)     errors["urlPattern"]     = "URL pattern field cannot be empty";
        if (!this.directory)      errors["directory"]      = "Directory field cannot be empty";
        if (!this.includePattern) errors["includePattern"] = "Include pattern field cannot be empty";
        // excludePattern can be empty
        return Object.keys(errors).length == 0 ? true : errors;
    };
}
