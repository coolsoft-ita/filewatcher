// Native connection port.
let port = null;

// Version of native app.
// It's an object like:
// {
//   version: "1.0.0",
//   protocolVersion: 1,
//   executable: "native executable fullpath",
// }
let nativeVersion = null;


/**
 * Object containing the rules applied to each existing tab.
 * Must be an object because we'll index data by tabId.
 *
 * Each object element contains the ruleId of the linked rule:
 * tabRules[<tabId>] = "rule1";
 */
let tabRules = {};


/*************************************
 * Browser tabs management
 *************************************/

/**
 * Tab create/update handler
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tabInfo) {
  if (changeInfo.url) {
    TabUpdatedHandler(tabId, changeInfo.url);
  }
});


/**
 * Tab destruction handler
 */
chrome.tabs.onRemoved.addListener(TabRemovedHandler);


/**
 * Find a rule that applies to the given tab and apply it.
 * It also deactivate the rule eventually already active on the tab.
 *
 * @param {string} rules
 * @param {string} tabId
 * @param {string} url
 */
function TabUpdatedHandler(tabId, url) {

  if (enabled) {

    // rule currently applied to the tab
    let curRuleId = tabRules[tabId];

    // find the new rule to apply
    let newRuleId = FindRuleForUrl(url);
    if (newRuleId) {
      console.log("Rule #" + newRuleId + " applies to url '" + url + "' (tab " + tabId + ")...");
      // test if newRuleId is the same as the current one
      if (curRuleId !== newRuleId || !port) {
        // stop the old rule
        if (curRuleId) {
          console.log("...replacing existing watcher");
          StopWatcher(curRuleId);
        }
        else {
          console.log("...starting new watcher");
        }
        // start the new one
        StartWatcher(newRuleId, rules[newRuleId]);
        tabRules[tabId] = newRuleId;
      }
      else {
        console.log("...no changes to current watcher");
      }
    }
    // no rule applies to this tab anymore,
    // stop the existing one
    else if (curRuleId) {
      console.log("...stopping current watcher");
      delete tabRules[tabId];
      StopWatcher(curRuleId);
    }

  }
}


/**
 * Reset the rule applied to a tab.
 *
 * @param {string} tabId
 */
function TabRemovedHandler(tabId, removeInfo = undefined) {
  // ruleId currently applied to the tab
  let ruleId = tabRules[tabId];
  if (ruleId) {
    delete tabRules[tabId];
    StopWatcher(ruleId);
  }
}


/**
 * Execute callback on each opened tab.
 * Callback must be a function that looks like this:
 *   function(Tab tab);
 */
function ForEachTab(callback) {
  chrome.tabs.query({}, function(tabs){
    tabs.forEach(callback);
  });
}


/**
 * Return the RuleId of the first (enabled) rule that satisfies the given URL.
 *
 * @param {string} url
 *   The URL to test for.
 *
 * @returns {string}
 *   The ID of the first rule that applies to the given URL or null.
 */
function FindRuleForUrl(url) {
  for (let ruleId in rules) {
    if (rules[ruleId].enabled && url.match(new RegExp(rules[ruleId].urlPattern))) {
      return ruleId;
    }
  }
  return '';
}


/*************************************
 * Utils
 *************************************/


/**
 * Intercepts clicks on notification popups
 */
browser.notifications.onClicked.addListener(function(notificationId, buttonIndex) {
  switch (notificationId) {
    case 'filewatcher-connection-error':
    case 'filewatcher-native-error':
      chrome.runtime.openOptionsPage();
      break;
  }
});


 /**
  * Show an error on native connection error.
  */
function ShowConnectionError() {
  ShowNotification(
    "There was an error starting FileWatcher native application. Click here to open extension options page and fix it.",
    "FileWatcher",
    'filewatcher-connection-error'
  );
}


/**
 * Handles incoming messages from the native binary.
 * @param {object} response
 */
function IncomingMessageHandler(response) {
//  console.log("Received:");
//  console.log(response);
  switch (response.msgId) {

    case "reload":
      let ruleId = response.ruleId;
      let tabFilter = { status: "complete" };
      if (onlyIfFocused) {
        tabFilter.currentWindow = true;
        tabFilter.active = true;
      }
      // get all tabs satisfying filter
      let querying = browser.tabs.query(tabFilter);
      querying.then(function(tabs) {
        for (let i in tabs) {
          let tabId = tabs[i].id;
          if (tabRules[tabId] == ruleId) {
            console.log("Refreshing tab: " + tabId + " because of rule #" + ruleId);
            chrome.tabs.reload(tabId, {bypassCache: true});
          }
        }
      });
      break;

    case "version":
      console.log("Native app version: " + response.version);
      break;

    case "error":
      console.log("Error from native app: " + response.message);
      ShowNativeError(response.message);
      // if the error has a ruleId field, then detach that rule from all tabs
      for (let tabId in tabRules) {
        if (tabRules[tabId] == response.ruleId) {
          delete tabRules[tabId]
        }
      }
      break;

  }
}


/*************************************
 * Port & watchers management
 *************************************/

/**
 * Open a native port connection and execute something on success/failure.
 *
 * @param {function} onSuccess
 *   Function executed if port is opened successfully (or was already open)
 * @param {function} onFailure
 *   Function executed if port open failed
 */
function PortOpen(onSuccess = null, onFailure = null) {

  // if the port is already open, execute onSuccess immediately
  if (port) {
    if (onSuccess !== null) {
      onSuccess();
    }
  }
  else {
    // attach temporary handlers to the port to test its connection failure
    var tmpSuccess = function(result) {
      // answer to first message was received so the port is open
      nativeVersion = result;
      // attach propert listeners
      port.onMessage.removeListener(tmpSuccess);
      port.onDisconnect.removeListener(tmpFailure);
      port.onMessage.addListener(IncomingMessageHandler);
      port.onDisconnect.addListener(PortClose);
      // execute original onSuccess() handler
      if (onSuccess !== null) {
        onSuccess();
      }
    };
    var tmpFailure = function() {
      // mark the port as closed
      port = null;
      nativeVersion = null;
      if (onFailure !== null) {
        onFailure();
      }
      else {
        ShowConnectionError();
      }
    };

    // open the port and connect the temporary handlers,
    // then send an initial "version" message
    port = chrome.runtime.connectNative('filewatcher');
    port.onDisconnect.addListener(tmpFailure);
    port.onMessage.addListener(tmpSuccess);

    // send an initial message to the native app to check its version
    // and also check if port is really open
    // NOTE: message will be received by tmpSuccess() handler.
    port.postMessage({ "msgId": "version" });
  }
}


/**
 * Close the native port connection
 */
function PortClose() {
  if (port) {
    // port could be already disconnected if we came here just after
    // a failed connect()
    try {
      // avoid looping back through onDisconnect handler
      port.onDisconnect.removeListener(PortClose);
      port.disconnect();
    }
    catch (e) {}
    port = null;
    nativeVersion = null;
  }
  // reset rules
  tabRules = {};
}


/**
 * Close the native port connection if not used
 */
function PortCloseIfUnused() {
  if (port && Object.keys(tabRules).length == 0) {
    PortClose();
  }
}


/**
 * Ask native application to start a watcher for the given ruleId.
 *
 * @param {string} ruleId
 * @param {Rule} rule
 */
function StartWatcher(ruleId, rule) {

  // open the native port and send message
  PortOpen(function(){
    port.postMessage({
      "msgId": "start",
      "ruleId": ruleId,
      "directory": rule.directory,
      "includePattern": rule.includePattern,
      "excludePattern": rule.excludePattern,
    });
  });
}


/**
 * Ask native application to stop a watcher for the given ruleId.
 *
 * @param {string} ruleId
 */
function StopWatcher(ruleId) {
  // send the stop command
  PortOpen(function(){
    port.postMessage({
      msgId: "stop",
      ruleId: ruleId,
    });
    // if we don't have any other rule active, close the native port
    if (Object.keys(tabRules).length == 0) {
      PortClose();
    }
  });
}


/**
 * Ask native application to stop all active watchers.
 */
function StopAllWatchers(onAfterExecution) {
  // reset tabRules collection
  tabRules = {};
  // send the stop command (only if the port is open)
  if (port) {
    PortOpen(function(){
      port.postMessage({
        msgId: "stopAll"
      });
      // close native app
      PortClose();
      // execute after handler
      if (onAfterExecution) {
        onAfterExecution();
      }
    });
  }
  // execute after handler
  else if (onAfterExecution) {
      onAfterExecution();
  }
}


/**
 * Send a message to native application.
 */
function SendNativeMessage(message) {
  // open the native port and send message
  PortOpen(function() { port.postMessage(message); });
}


/****************************************
 * Settings
 ****************************************/
// local values
var enabled = null;
var rules = {};
var onlyIfFocused = true;

// attach to settings changes
chrome.storage.onChanged.addListener(function(changes){

  // "rules" is changed
  if (typeof changes.rules !== 'undefined') {
    rules = JSON.parse(changes.rules.newValue);
    RulesChangedHandler();
  }

  // "enabled" is changed (must be checked after "rules")
  if (typeof changes.enabled !== 'undefined') {
    enabled = changes.enabled.newValue;
    EnabledChangedHandler();
  }

});


// load initial settings values
chrome.storage.local.get(['enabled', 'rules'], function(settings) {
  // set local values
  enabled = settings.enabled;
  rules = JSON.parse(settings.rules || "{}");
  // call handlers
  EnabledChangedHandler();
  RulesChangedHandler();
});


/**
 * Handles "enabled" setting changes
 */
function EnabledChangedHandler() {
  // update action button
  if (enabled) {
    RulesChangedHandler();
    chrome.browserAction.setIcon({path: "icons/icon-32.png"});
    chrome.browserAction.setTitle({title: "Filewatcher is enabled"});
  }
  else {
    StopAllWatchers();
    chrome.browserAction.setIcon({path: "icons/icon-32-off.png"});
    chrome.browserAction.setTitle({title: "Filewatcher is disabled"});
  }
}


/**
 * Handles "rules" setting changes and re-apply the new rules to open tabs.
 */
function RulesChangedHandler() {
  if (enabled) {
    StopAllWatchers(function(){
      // apply new rules to opened tabs
      ForEachTab(function(tab){
        TabUpdatedHandler(tab.id, tab.url);
      });
    });
  }
}


/****************************************
 * Extension installation/removal
 ****************************************/
function handleInstalled(details) {
    switch (details.reason) {
        case 'install':
        case 'update':
            chrome.runtime.openOptionsPage();
            browser.tabs.create({
                url: "https://coolsoft.altervista.org/filewatcher#install",
            });
            break;
    }
}
browser.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.setUninstallURL("https://coolsoft.altervista.org/filewatcher#uninstall");
