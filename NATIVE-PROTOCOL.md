# Native communication protocol

## Introduction

FileWatcher needs to access host filesystem to detect when one of the files contained
in a watched directory has been created/changed/deleted;
when this happens, it must notify the WebExtension causing a webpage reload.

For security reasons browsers don't allow WebExtensions to
access the host filesystem, so there's no other way for them to know when
something changed in watched directories but using a **native apps**.

## Native app

A **native app** (NA from now on) is an executable running on the host that can
exchanges messages with the WebExtension and implements all the missing pieces
(see [Mozilla Firefox reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)).  

The NA runs with browser user privileges and so have access to all of the
resources that user is allowed to use (filesystem, network, GUI, ...).
It is automatically started and terminated by the browser process itself when needed.

## Protocol

Protocol version: 1.0

The easiest way for a WebApplication to exchange messages with its NA
is using STDIN/STDOUT: the WebExtension starts NA process, writes to its STDIN and
reads from its STDOUT.

NOTE: to debug exchanged messages you can use the browser console (CTRL+J on Firefox).

Messages sent between FileWatcher extension and its NA are **JSON messages** with this basic format:
```
{
    msg: <messageId>
}
```
Messages could have additional parameters, depending on the message type.   
If the message needs a response, the NA must send back a proper JSON response message.

## Messages
Here's a list of supported messageIds, their parameters and expected responses.

### version
Sent by the WebExtension to get NA info.
 
```
WebExtension 🡆 NA
{
    msg: "version"
}
```

The NA must reply with a message like this:
```
NA 🡆 WebExtension
{
    msg:             "version",
    version:         <native app version number>,
    executable:      <absolute path of native app binary>,
    protocolVersion: <version of communication protocol (actually = "1.0")>
}
```

### start

Starts a new watcher instance on the given directory.

NOTE: the WebExtension sends a "start" for each opened tab that satisfies a rule, and
a stop for each tab that does not satisfies it anymore.
The NA must keep an activation counter for each watcher/rule pair.
```
WebExtension 🡆 NA
{
    msg:            "start",
    ruleId:         <ID of the rule to start the watcher for>,
    directory:      <absolute path of the directory to watch>,
    includePattern: <regular expression pattern of the files to include in watcher>
}
```

### stop

Stop the existing watcher for the given ruleId.
If the watcher does not exist, no error is raised.

NOTE: the WebExtension sends a "start" for each opened tab that satisfies a rule, and
a stop for each tab that does not satisfies it anymore.
The NA must keep an activation counter for each watcher/rule pair.
```
WebExtension 🡆 NA
{
    msg:    "stop",
    ruleId: <ID of the rule to stop the watcher for>
}
```


### stopAll

Stop all the existing watchers.

NOTE: this message is sent when configuration is changed and is followed by new starts.
The NA must close all active watchers despite their counter value.
```
{
    msg: "stopAll"
}
```

### directorySelect
  
Show a system native folder selection dialog to the user and returns
the selected folder to WebExtension.
```
WebExtension 🡆 NA
{
    msg:        "folderSelect",
    ruleId:     <ID of the rule to show the selection dialog for>,
    directory:  <(optional) currently selected directory>
}
```
If the user aborts selection no response is sent, otherwise the NA send a message like this:  
```
NA 🡆 WebExtension 
{
    msg:        "folderSelect",
    ruleId:     <the rule to set directory>,
    directory:  <user selected directory>
}
```

**NOTE: this command is executed in a separate NA that MUST terminate after the reply has been sent back to webextension**

### reload
Sent by NA to the WebExtension when the watcher of a rule detects a change.

```
NA 🡆 WebExtension 
{
    msg:        "reload",
    ruleId:     <ID of the rule that triggered the reload>
}
```
