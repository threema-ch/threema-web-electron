#!/bin/bash
# shellcheck disable=SC2154
set -euo pipefail

if [ "$1" == "red" ]
then
  echo "$ms_authenticode_password" | signcode  -spc authenticode.spc  -v authenticode.pvk  -a sha256 -$ commercial  -n Threema\ Red\ Desktop  -i https://www.threema.ch/ -t http://timestamp.digicert.com/scripts/timstamp.dll -tr 10  app/build/dist-electron/installers/threema_red*-setup.exe
elif [ "$1" == "work" ]
then
  echo "$ms_authenticode_password" | signcode  -spc authenticode.spc  -v authenticode.pvk  -a sha256 -$ commercial  -n Threema\ Work\ Desktop  -i https://www.threema.ch/ -t http://timestamp.digicert.com/scripts/timstamp.dll -tr 10  app/build/dist-electron/installers/threema_work*-setup.exe
elif [ "$1" == "consumer" ]
then
  echo "$ms_authenticode_password" | signcode  -spc authenticode.spc  -v authenticode.pvk  -a sha256 -$ commercial  -n Threema\ Desktop  -i https://www.threema.ch/ -t http://timestamp.digicert.com/scripts/timstamp.dll -tr 10  app/build/dist-electron/installers/threema_web*-setup.exe
else
  echo "Could not sign installer for $1"
fi