#!/bin/bash
set -euo pipefail

security unlock-keychain -p "$CI_KEYCHAIN_PASSWORD" ~/Library/Keychains/electron-ci-secrets.keychain-db