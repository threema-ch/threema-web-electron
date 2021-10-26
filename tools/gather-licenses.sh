#!/usr/bin/env bash
set -euo pipefail

LICENSE_FILES=(
    '@threema-wasm-minisign-verify' 'app/node_modules/@threema/wasm-minisign-verify/LICENSE-MIT'
    'electron-context-menu' 'app/node_modules/electron-context-menu/license'
    'electron-log' 'app/node_modules/electron-log/LICENSE'
    'semver' 'app/node_modules/semver/LICENSE'
    'threema-web' 'app/dependencies/threema-web/LICENSE.txt'
)
FILE=LICENSE-3RD-PARTY.txt

echo -e "Licenses for third party libraries in Threema for desktop:\n\n\n\n" > $FILE
for i in ${!LICENSE_FILES[@]}; do
    if (( $i % 2 == 0 )); then
        echo -e "----------" >> $FILE
        echo -e "License for ${LICENSE_FILES[$i]}" >> $FILE
        echo -e "----------\n" >> $FILE
    else
        cat "${LICENSE_FILES[$i]}" >> $FILE
        echo -e "\n\n\n" >> $FILE
    fi
done
