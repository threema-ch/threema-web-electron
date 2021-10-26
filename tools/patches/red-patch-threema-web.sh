#!/usr/bin/env bash

echo "Patching for Threema Red"

if [ -z ${threema_web_version+x} ]
  then echo "threema_web_version is not set. Cannot patch!";
  exit 1;
fi

cd "app/dependencies/threema-web/release/$threema_web_version/"

sed -i.bak -E "s/SALTYRTC_HOST:[^,]*,/SALTYRTC_HOST:\"saltyrtc-staging.threema.ch\",/g" *.bundle.js
sed -i.bak -E "s/PUSH_URL:\s*\"http[^\"]*\",/PUSH_URL:\"https:\/\/push-web-staging.threema.ch\/push\",/g" *.bundle.js
sed -i.bak -E "s/CONSOLE_LOG_LEVEL:[^,]*,/CONSOLE_LOG_LEVEL:\"debug\",/g" *.bundle.js
sed -i.bak -E "s/ARP_LOG_TRACE:[^,]*,/ARP_LOG_TRACE:false,/g" *.bundle.js

cd ../../../../..
