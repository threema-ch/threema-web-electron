<div align="center">
  <!-- Centered README header hack -->
  <img width="400" src="logo.svg">
  <br><br>
</div>

# Threema for Desktop

Threema for desktop is a desktop client for Threema, a privacy-focused
end-to-end encrypted mobile messenger hosted and developed in Switzerland. With
Threema for desktop, you can use Threema on your desktop without compromising
security.

## Bug Reports and Feature Requests

If you find a bug in Threema for desktop, feel free to start a new thread in the
[unofficial community forum](https://threema-forum.de/index.php?board/23-bugs-und-fehlermeldungen/)
or contact
[support](https://threema.ch/en/request/default?i_have_read_the_faq=1).

Please note that we are already working on a
[new architecture for Threema for desktop](https://threema.ch/en/blog/posts/md-architectural-overview-intro)
and have already taken many feature requests into account. The new solution will
allow Threema for desktop to send and receive messages even when the associated
phone is offline.

## Development

Threema for desktop is built on top of the existing
[Threema Web project](https://github.com/threema-ch/threema-web) and
[Electron](https://www.electronjs.org).

To build Threema for desktop, follow the steps below.

**Step 0: Ensure that Git submodules are checked out**

    git submodule update --init

**Step 1: Build Threema Web**

    export DEV_ENV=development
    export threema_web_version=threema-web-2.4.2
    npm install
    ./tools/patches/patch-threema-web.sh
    npm run app:build:web
    ./tools/patches/post-patch-threema-web.sh

**Step 2: Set the target configuration**

Export the `TARGET_OS` and `TARGET_ID` env variables:

| OS      | Package Type | $TARGET_OS | $TARGET_DIST | $TARGET_PKG       |
| ------- | ------------ | ---------- | ------------ | ----------------- |
| macOS   | DMG          | macOS      | macos        | macos:dmg         |
| macOS   | ZIP          | macOS      | macos        | macos:zip         |
| Linux   | DEB          | linux-deb  | linux:deb    | linux:deb         |
| Linux   | RPM          | linux-deb  | linux:rpm    | linux:rpm         |
| Windows | EXE          | windows    | windows      | windows:installer |

For example, for a macOS DMG:

    export TARGET_OS=macOS
    export TARGET_DIST=macos
    export TARGET_PKG=macos:dmg

**Step 3: Package Threema Web into Electron**

    npm run app:install
    node tools/patches/post-patch-threema-web.js $TARGET_OS consumer
    npm run electron:dist:$TARGET_DIST:consumer
    npm run electron:package:$TARGET_PKG:consumer

The built app can be found in `app/build/dist-electron/packaged`.

## Contributing

Contributions to Threema for desktop are welcome! Please note that Threema Web
is in [maintenance mode](https://github.com/threema-ch/threema-web/pull/996).
Not all contributions will make it into the multi-device desktop client.

## Security

If you discover a security issue in the Threema for desktop, please follow
responsible disclosure and report it directly to Threema instead of opening an
issue on Github. You can find the security e-mail as well as the PGP public key
at <https://threema.ch/en/contact>.

## License

Threema for desktop is licensed under the GNU Affero General Public License v3.

    Copyright (c) 2016-2021 Threema GmbH

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License, version 3,
    as published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.

The full license text can be found in `LICENSE.txt`.

For third party library licenses, see `LICENSE-3RD-PARTY.txt`.
