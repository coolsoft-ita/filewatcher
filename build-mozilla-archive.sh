#!/bin/bash
function usage() {
  echo "Usage:"
  echo "$0 <versionNumber>"
}

# exit the script with a pause (if interactive)
exitScript() {
  if [[ -n "$TERM" ]]; then
    echo "Press any key to close..."
    read
  fi
  exit $1
}

VERSION=`sed 's/.*"version": "\(.*\)".*/\1/;t;d' webextension/manifest.json`
if [[ $VERSION == "" ]]; then
  echo "Can't find version number in manifest.json"
  exitScript 1
fi

ARCHIVE="filewatcher-$VERSION.zip"
{
  cd webextension/
  rm -f $ARCHIVE
  7z a -o../ $ARCHIVE *
  mv -f $ARCHIVE ../
}
