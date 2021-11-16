#!/usr/bin/env bash

echo "Patching for Threema Red"

if [ -z ${threema_web_version+x} ]
  then echo "threema_web_version is not set. Cannot patch!";
  exit 1;
fi

cd "app/dependencies/threema-web/release/$threema_web_version/"

export SALTYRTC_HOST=saltyrtc-staging.threema.c
export PUSH_URL=https://push-web-staging.threema.ch/push

if [[ ! -f userconfig.js ]]; then
    echo "Error: Userconfig not found"
    exit 1
fi
echo '// Overrides by red-patch-threema-web.sh' >> userconfig.js
if [ ! -z "${SALTYRTC_HOST:-}" ]; then
    echo "window.UserConfig.SALTYRTC_HOST = '${SALTYRTC_HOST}';" >> userconfig.js
fi
if [ ! -z "${PUSH_URL:-}" ]; then
    echo "window.UserConfig.PUSH_URL = ${PUSH_URL};" >> userconfig.js
fi

sed -i.bak -E "s/CONSOLE_LOG_LEVEL:[^,]*,/CONSOLE_LOG_LEVEL:\"debug\",/g" *.bundle.js

cd ../../../../..
