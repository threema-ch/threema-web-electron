#!/usr/bin/env bash

if [ -z ${threema_web_version+x} ]
  then echo "threema_web_version is not set. Cannot patch!";
  exit 1;
fi

cd "app/dependencies/threema-web/release/$threema_web_version/"

echo "Enable in-memory sessions."
sed -i.bak -E "s/IN_MEMORY_SESSION_PASSWORD:(true|false|0|1|\!0|\!1)/IN_MEMORY_SESSION_PASSWORD:true/g" *.bundle.js

cd ../../../../..
