## Overview

To use the filewatcher extension, you need to:

* Get the dependencies necessary to build the native application.
* Build the native application.
* Install the application somewhere.
* Install the application manifest file.

Step-by-step instructions follow below.


## Dependencies

In order to build the application, you need:

* GNU make
* A C++ compiler supporting C++11 (gcc 4.8.1 or newer, clang 3.3 or newer)

You can check if they are installed by opening a terminal and running:
```
which make c++
```
which should print two lines if both make and a c++ compiler are installed.

If they are not installed, install them using your package manager.

Here are commands to install the dependencies, for a couple of distros.

**Debian-based systems** (Ubuntu, Linux Mint, etc.)

```
sudo apt install -y make g++
```


**Redhat/Fedora/Centos**

```
sudo dnf install -y make gcc-c++
```

_Use `yum` instead of `dnf` on older versions of these distros_


## Building

From the root directory of this project, run:

```
cd native-app
make
```
If the build is successful, the executable file `filewatcher` should now be
present in the directory `native-app`. That executable is what the web extension
will run and connect to, to get notifications from the file system.


## Installing

The executable can be placed anywhere your user has execution rights, but if you
move it after finishing the setup, you need to update the path in the manifest
file to match the new location.


### Local installation

In a terminal, from the `native-app` directory, run:

```
APP_DIR=$HOME/.local/bin
MANIFEST_DIR=$HOME/.mozilla/native-messaging-hosts
mkdir -p $APP_DIR
mkdir -p $MANIFEST_DIR
mv filewatcher $APP_DIR
$APP_DIR/filewatcher --manifest-ff > $MANIFEST_DIR/filewatcher.json
```

Change the value of the `APP_DIR` variable if you want to install
it somewhere else. Note that the location does not have to be in
your `PATH` variable; the location of the executable is registered
in the `filewatcher.json` manifest file.


### System-wide installation

In a terminal, from the `native-app` directory, run (as root):

```
APP_DIR=/usr/bin
MANIFEST_DIR=/usr/lib/mozilla/native-messaging-hosts
mkdir -p $MANIFEST_DIR
mv filewatcher $APP_DIR
$APP_DIR/filewatcher --manifest-ff > $MANIFEST_DIR/filewatcher.json
```
