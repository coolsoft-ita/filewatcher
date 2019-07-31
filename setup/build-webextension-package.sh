#!/bin/bash
SETUPPATH=$(realpath "`dirname $0`")
VER=$(sed -ne "s/ *\"version\": ['\"]\([^'\"]*\)['\"] *,/\1/p" $SETUPPATH/../webextension/manifest.json)
FILENAME=$SETUPPATH/FileWatcher_WebExtension_$VER.zip

if [ -f "$FILENAME" ]; then
  if [ "$1" != "-f" ]; then
    echo "Output filename $FILENAME already exists, use -f to force overwrite!"
    exit 1
  else
    echo "Removing existing archive $FILENAME"
    rm -f $FILENAME
  fi
fi

ZIP=`which zip 2> /dev/null`
if [ ! -x "$ZIP" ]; then
    echo "zip command is missing, aborting!"
    exit 1
fi

# create new
cd $SETUPPATH/../webextension && $ZIP "$FILENAME" \
  manifest.json  \
  README.md      \
  background/*   \
  icons/*        \
  js/*           \
  options/*      \
  popup/*

# completed
echo
echo "ZIP file $FILENAME created"
