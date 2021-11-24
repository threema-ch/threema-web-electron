export INSTALLER=deb
export FLAVOUR=consumer

node tools/patches/post-patch-threema-web.js linux-$INSTALLER $FLAVOUR
npm run electron:dist:linux:$INSTALLER:$FLAVOUR
npm run electron:package:linux:$INSTALLER:$FLAVOUR
