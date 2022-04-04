#!/bin/bash
set -euo pipefail

echo "Patching for Threema Red"

if [ -z ${threema_web_version+x} ]
  then echo "threema_web_version is not set. Cannot patch!";
  exit 1;
fi

cd "app/dependencies/threema-web/release/$threema_web_version/"

export SALTYRTC_HOST=saltyrtc-staging.threema.ch
export PUSH_URL=https://push-web-staging.threema.ch/push
export RED_DEBUG=true

if [[ ! -f userconfig.js ]]; then
    echo "Error: Userconfig not found"
    exit 1
fi
echo '// Overrides by red-patch-threema-web.sh' >> userconfig.js
if [ -n "${SALTYRTC_HOST:-}" ]; then
    echo "window.UserConfig.SALTYRTC_HOST = '${SALTYRTC_HOST}';" >> userconfig.js
fi
if [ -n "${PUSH_URL:-}" ]; then
    echo "window.UserConfig.PUSH_URL = '${PUSH_URL}';" >> userconfig.js
fi
if [ -n "${RED_DEBUG:-}" ]; then
    echo "window.UserConfig.ARP_LOG_TRACE = '${RED_DEBUG}';" >> userconfig.js
    echo "window.UserConfig.CONSOLE_LOG_LEVEL = 'debug';" >> userconfig.js
fi

cd ../../../../..
