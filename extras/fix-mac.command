#!/bin/bash
# Double-click this on a Mac if macOS says Cafe "is damaged" or "can't be opened".
# It removes the download quarantine flag and adds a local (ad-hoc) signature, which Apple Silicon Macs require.
cd "$(dirname "$0")"
APP="$(find . -maxdepth 2 -name 'Cafe.app' | head -1)"
if [ -z "$APP" ]; then echo "Put this file next to Cafe.app first."; read -n 1; exit 1; fi
xattr -cr "$APP"
codesign --force --deep --sign - "$APP" && echo "Done: you can open Cafe now." 
read -n 1 -p "Press any key to close."
