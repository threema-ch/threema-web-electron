#!/usr/bin/env bash

cd app/dependencies/threema-web
echo "Patching new user agent detection"
git apply ../../../tools/patches/patch-user-agent.patch
echo "Patching looks (web icon and status bar)"
git apply ../../../tools/patches/patch-looks.patch
cd ../../../
