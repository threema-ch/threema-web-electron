if [ $@ == "red" ]
then
  echo $ms_authenticode_password | signcode  -spc authenticode.spc  -v authenticode.pvk  -a sha256 -$ commercial  -n Threema\ Red\ Desktop  -i https://www.threema.ch/ -t http://timestamp.digicert.com/scripts/timstamp.dll -tr 10  app/build/dist-electron/installers/threema_red*-setup.exe
elif [ $@ == "work" ]
then
  echo $ms_authenticode_password | signcode  -spc authenticode.spc  -v authenticode.pvk  -a sha256 -$ commercial  -n Threema \Work\ Desktop  -i https://www.threema.ch/ -t http://timestamp.digicert.com/scripts/timstamp.dll -tr 10  app/build/dist-electron/installers/threema_work*-setup.exe
elif [ $@ == "consumer" ]
then
  echo $ms_authenticode_password | signcode  -spc authenticode.spc  -v authenticode.pvk  -a sha256 -$ commercial  -n Threema \Desktop  -i https://www.threema.ch/ -t http://timestamp.digicert.com/scripts/timstamp.dll -tr 10  app/build/dist-electron/installers/threema_web*-setup.exe
else
  echo "Could not sign installer for $@"
fi