import * as electron from "electron";
import * as ChildProcess from "child_process";
import {format as formatUrl} from "url";
import * as path from "path";
import * as Updater from "./updater/updater";
import * as pack from "../package.json";
import * as log from "electron-log";
import {I18n} from "./i18n/i18n";
import {getMenu} from "./menu";
import contextMenu from "electron-context-menu";
import {showOutdatedDialog, appIsValid} from "./appAgeValidityChecker";

const isDevelopment = process.env.NODE_ENV === "development";
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

let window: electron.BrowserWindow | undefined;
const hasSingleInstanceLock = electron.app.requestSingleInstanceLock();
const disposeContextMenu = contextMenu();

setupLogging();

if (!hasSingleInstanceLock) {
  electron.app.quit();
  log.info(`We do not have the single instance lock ${hasSingleInstanceLock}`);
} else {
  electron.app.on("second-instance", () => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      if (window.isMinimized()) {
        window.restore();
        window.focus();
        return;
      }
    }
  });
}

checkShouldQuitAfterInstallation();

// On windows if 2D canvas is disabled we cannot use hardware accelleration; Otherwise electron
// will not load the website with error message ERR_FAILED (-2).
if (process.platform === "win32") {
  try {
    const enabled2dCanvas = electron.app
      .getGPUFeatureStatus()
      ["2d_canvas"].startsWith("enabled");

    if (!enabled2dCanvas) {
      electron.app.disableHardwareAcceleration();
    }
  } catch (error) {
    log.warn(`Could not check getGPUFeatureStatus: ${error}`);
    electron.app.disableHardwareAcceleration();
  }
}

// Create main BrowserWindow when electron is ready
electron.app.on("ready", () => {
  start(electron.session.defaultSession).catch((error) => {
    log.error(`An error occurred when starting the session ${error}`);
  });
});

// Dispose context menu when quitting
electron.app.on("will-quit", () => {
  disposeContextMenu();
});

// Expose an app data store through IPC. This allows storing simple key-value data
// that survives a page reload.
const appDataStore: Record<string, unknown> = {};
electron.ipcMain.on("app-data-store:set-value", (event, arg) => {
  appDataStore[arg.key.toString()] = arg.value;
  event.returnValue = undefined;
});
electron.ipcMain.on("app-data-store:get-value", (event, arg) => {
  event.returnValue = appDataStore[arg.key.toString()];
});

// Check for, download and prompt to install updates.
// Downloaded updates are automatically applied on the next launch through Squirrel.
function checkForUpdates(updater: Updater.Updater): void {
  // Windows builds cannot apply updates on the first run
  if (process.argv[1] !== "--squirrel-firstrun") {
    const locale = new I18n(electron.app.getLocale());
    updater.checkAndDownloadUpdates(electron.dialog, locale).catch((error) => {
      log.error(`An error occurred while checking for updates: ${error}`);
    });
  } else {
    log.info("Do not do update on first run!");
  }
}

async function start(session: electron.Session): Promise<void> {
  // Squirrel events should be handled as quickly as possible.

  if (handleSquirrelEvent()) {
    // If we are handling a squirrel event nothing else will happen because the app will quit
    return;
  }

  for (const arg of process.argv) {
    log.info(`Argument is ${arg}`);
    if (arg === "--reload-on-suspend") {
      log.info(`handlePowerMonitor `);
      handlePowerMonitor(electron.powerMonitor);
    }
  }

  // To disable the dictionary downloads we need to set a custom download URL
  session.setSpellCheckerDictionaryDownloadURL("https://threema.invalid/");
  session.setSpellCheckerEnabled(false);

  // We set the properties to their default values even if they are the same as what we want in
  // order to avoid suprises when upgrading to new versions.

  const preloadScript = path.join(
    electron.app.getAppPath(),
    "dist",
    "src",
    "preload.js",
  );

  const windowWidth = 1000;

  window = new electron.BrowserWindow({
    width: windowWidth + 1,
    height: 800,
    title: pack.executableName,
    icon: getIconLocation(),
    webPreferences: {
      // Order from https://www.electronjs.org/docs/latest/api/browser-window/
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      preload: preloadScript,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webgl: false,
      plugins: false,
      experimentalFeatures: false,
      contextIsolation: true,
      webviewTag: false,
      navigateOnDragDrop: false,
      spellcheck: false,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      enableWebSQL: false,
    },
  });

  window.webContents.on(
    "did-fail-load",
    (
      event: Event,
      errorCode: number,
      errorDescription: string,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      validatedURL: string,
      isMainFrame: boolean,
      frameProcessId: number,
      frameRoutingId: number,
    ) => {
      log.error(
        `An error ocurred while loading webConents with: errorCode ${errorCode}, validatedURL ${validatedURL}, isMainFrame ${isMainFrame}, frameProcessId ${frameProcessId}, frameRoutingId ${frameRoutingId}`,
      );
    },
  );

  window.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      window?.webContents.openDevTools();
    }
  });

  // On Linux we need to additionally set the window icon here. Otherwise the
  // app will show up without an icon on launch.
  if (process.platform === "linux") {
    window.setIcon(getIconLocation());
  }

  // Open dev tools only on development
  if (isDevelopment) {
    window.webContents.openDevTools();
  }

  // Automatic updates are only supported on Windows and macOS
  if (
    !isDevelopment &&
    (process.platform === "win32" || process.platform === "darwin")
  ) {
    // We check for updates on launch and after that every hour
    const updater = new Updater.Updater(
      electron.app.getVersion(),
      electron.app.getPath("temp"),
      pack.serverKeyset,
      electron.autoUpdater,
      electron.powerMonitor,
    );

    setTimeout(() => {
      checkForUpdates(updater);
    }, 30 * SECOND);

    setInterval(() => {
      checkForUpdates(updater);
    }, 3 * HOUR);
  }

  setInterval(() => {
    checkValidity().catch((error) => {
      log.error(`Could not check the validity because of an error: ${error}`);
    });
  }, 8 * HOUR);

  //Set custom user agent
  const oldUserAgent = window.webContents.getUserAgent();
  const currVersion = pack.version;
  const newUserAgent = `${process.platform}ThreemaDesktop/${currVersion}-${oldUserAgent}`;
  window.webContents.userAgent = newUserAgent;
  log.info(`Setting user agent to ${newUserAgent}.`);

  // Load Threema Web from our local build
  const url = getWebLocation();

  log.debug(`Running in mode: ${process.env.NODE_ENV}`);
  log.info(`Serving app from ${url}`);

  // According to https://github.com/electron/electron/issues/28208#issue-832312268
  // setting reloadIgnoringCache solves the issue with the app sometimes not being able to
  // correctly load the website.
  await window.loadURL(url);
  window.setTitle(pack.executableName);

  await setMinimalAsDefault();

  setupMenu(new I18n(electron.app.getLocale()));

  log.info("Finished setupMenu");

  // Since we are a single window application we quit if any window is closed
  window.on("closed", () => {
    window = undefined;
    electron.app.quit();
  });

  // Only grant required permissions, deny everything else. Deny if any
  // other URL has been provided.
  session.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      function deny(error: string): void {
        log.error(error);
        callback(false);
      }

      const requestingUrl = new URL(contents.getURL());
      const detailsUrl = new URL(details.requestingUrl);
      const webclientLocation = new URL(getWebLocation());

      // The app is only served from one file URL that may request permissions.
      // Only the main frame may request it and external URLs may not be loaded.
      if (requestingUrl.protocol !== "file:") {
        return deny(
          `Permission request from unexpected URL ${contents.getURL()}`,
        );
      }
      if (detailsUrl.protocol !== "file:") {
        return deny(
          `Permission request from unexpected requesting URL ${details.requestingUrl}`,
        );
      }
      if (!details.isMainFrame) {
        return deny(`Permission request from non-main thread`);
      }

      if (!`${requestingUrl}`.startsWith(`${webclientLocation}`)) {
        return deny("Wrong URL requesting!");
      }

      if (!`${detailsUrl}`.startsWith(`${webclientLocation}`)) {
        return deny("Wrong URL requesting!");
      }

      if (permission === "notifications") {
        return callback(true);
      }

      // Deny all other permissions
      return deny(`Denied permission request: ${permission}`);
    },
  );

  // Only allow permission request from our local web app if they are a request
  // for notifications. We don't need any other permissions
  session.setPermissionCheckHandler(
    (contents, permission, requestingOrigin, details): boolean => {
      const webclientLocation = new URL(getWebLocation());

      if (contents !== null) {
        const requestingUrl = new URL(contents.getURL());
        // The app is only served from one file URL that may request permissions.
        // Only the main frame may request it and external URLs may not be loaded.
        if (requestingUrl.protocol !== "file:") {
          return false;
        }
        if (!`${requestingUrl}`.startsWith(`${webclientLocation}`)) {
          return false;
        }
      }

      if (details.requestingUrl !== undefined) {
        const detailsUrl = new URL(details.requestingUrl);

        if (detailsUrl.protocol !== "file:") {
          return false;
        }
        if (!details.isMainFrame) {
          return false;
        }

        if (!`${detailsUrl}`.startsWith(`${webclientLocation}`)) {
          return false;
        }
      }

      if (requestingOrigin !== "") {
        const requestingUrl = new URL(requestingOrigin);

        if (requestingUrl.protocol !== "file:") {
          return false;
        }
      }

      if (permission === "notifications") {
        return true;
      }

      // Deny all other permissions
      return false;
    },
  );

  // Apply a strict content security policy to any response
  session.webRequest.onHeadersReceived((details, callback) => {
    if (details.url.startsWith("devtools://")) {
      return callback({
        responseHeaders: {
          ...details.responseHeaders,
          /* eslint-disable */
          "Content-Security-Policy": [
            /* eslint-enable */
            // Fetch directives
            "default-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
          ].join("; "),
        },
      });
    }
    return callback({
      responseHeaders: {
        ...details.responseHeaders,
        /* eslint-disable */
        "Content-Security-Policy": [
          /* eslint-enable */
          // Fetch directives
          "default-src 'self'",
          "child-src 'none'",
          "connect-src 'self' https://*.threema.ch wss://*.threema.ch",
          "font-src 'self' https://static.threema.ch",
          "frame-src 'none'",
          "img-src 'self' data:",
          "media-src 'self' data:",
          "object-src 'none'",
          "script-src 'self' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://static.threema.ch",
          "worker-src 'none'",

          // Document directives
          "base-uri 'none'",
          "sandbox allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads",

          // Navigation directives
          "form-action 'self'",
          "frame-ancestors 'none'",
          "navigate-to 'self'",

          // Other directives
          "upgrade-insecure-requests",
        ].join("; "),
      },
    });
  });

  await checkValidity();
}

// Quit application when all windows are closed
electron.app.on("window-all-closed", () => {
  // Since our application is not useful* if the window is closed, we quit on all platforms
  // * the webclient will disconnect if the window is closed.
  electron.app.quit();
});

// Disallow navigation, creation of new windows or web views
electron.app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, url) => {
    const webclientLocation = new URL(getWebLocation());
    if (!url.toString().startsWith(`${webclientLocation}`)) {
      log.error(`Security violation: Attempt to navigate to ${url}`);
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({url}) => {
    // We only allow opening URLs that can be parsed by URL and only allow protocols http and https.
    // Some more details on potential exploits are given in https://benjamin-altpeter.de/shell-openexternal-dangers/.
    if (isSafeForExternalOpen(url)) {
      electron.shell.openExternal(url).catch((error) => {
        log.error(`An error ocurred while opening an external URL: ${error}`);
      });
    } else {
      log.warn(`URL was not safe for open ${url}`);
    }

    return {action: "deny"};
  });

  contents.on("will-attach-webview", (event) => {
    log.error("Security violation: Attempt to create a web view");
    event.preventDefault();
  });
});

function isSafeForExternalOpen(url: string): boolean {
  const parsedUrl = maybeParseUrl(url);
  if (parsedUrl === undefined) {
    log.error(`Could not open url ${url}`);
    return false;
  }

  const {protocol} = parsedUrl;

  if (protocol === "http:" || protocol === "https:") {
    return true;
  }

  return false;
}

function maybeParseUrl(url: string): undefined | URL {
  try {
    return new URL(url);
  } catch {
    // We ignore errors and just return undefined instead
  }

  return undefined;
}

function getIconLocation(): string {
  const flavour = pack.flavour;
  const appPath = electron.app.getAppPath();
  switch (process.platform) {
    case "win32":
      return path.join(appPath, "assets", "icons", "win32", `${flavour}.ico`);
    case "darwin":
      if (flavour === "consumer") {
        return path.join(appPath, "assets", "icons", "mac", "icons.icns");
      } else {
        return path.join(
          appPath,
          "assets",
          "icons",
          "mac",
          `${flavour}-icons.icns`,
        );
      }
    case "linux":
    default:
      return path.join(
        appPath,
        "assets",
        "icons",
        "png",
        `${flavour}-512x512.png`,
      );
  }
}

function handlePowerMonitor(powerMonitor: electron.PowerMonitor): void {
  powerMonitor.on("suspend", () => {
    log.info(`We are suspending`);
    if (process.platform === "linux") {
      log.info("Reload because we are suspending");
      window?.webContents.reload();
    }
  });
}

async function setMinimalAsDefault(): Promise<void> {
  if (window !== undefined) {
    const settingsUserInterface = await window.webContents.executeJavaScript(
      'localStorage.getItem("settings-userInterface")',
      false,
    );
    if (settingsUserInterface === null) {
      await window.webContents.executeJavaScript(
        'localStorage.setItem("settings-userInterface", "minimal")',
        false,
      );
      await window.webContents.executeJavaScript(
        'window.app.settingsService.userInterfaceChange.post("minimal")',
        false,
      );
    } else {
      log.error(`Already set theme to ${settingsUserInterface}`);
    }
  } else {
    log.error(
      "Could not set minimal as default because the window was undefined.",
    );
  }
}

/**
 * Return a file://-URL pointing to the local Threema Web directory.
 */
function getWebLocation(): string {
  const url: string = formatUrl({
    pathname: path.join(
      electron.app.getAppPath(),
      "dependencies",
      "threema-web",
      "release",
      pack.threemaWebVersion,
      "index.html",
    ),
    protocol: "file:",
    slashes: true,
  });

  return url;
}

function setupLogging(): void {
  log.catchErrors();
}

function setupMenu(locale: I18n): void {
  electron.Menu.setApplicationMenu(getMenu(locale));
}

async function checkValidity(): Promise<void> {
  if (!appIsValid(pack.appAge)) {
    const locale = new I18n(electron.app.getLocale());
    await showOutdatedDialog(electron.app, electron.dialog, locale);
  }
}

function checkShouldQuitAfterInstallation(): void {
  let quitAfterInstallation = false;
  let squirrelFirstLaunch = false;
  for (const arg of process.argv) {
    if (arg === "--quit-after-installation") {
      quitAfterInstallation = true;
    }
    if (arg === "--squirrel-firstrun") {
      squirrelFirstLaunch = true;
    }
  }

  if (quitAfterInstallation && squirrelFirstLaunch) {
    log.info("Should quit after installation.");
    electron.app.quit();
  }
}

/* eslint-disable */

// This returns true if the app will quit shortly after returning. Otherwise it will return false.
// The following method was copied from https://github.com/electron/windows-installer.
// It is marked with //START LICENSED 1 and //END LICENSED 1
// It is licensed under the MIT License:
// Copyright (c) 2015 GitHub Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

//START LICENSED 1
function handleSquirrelEvent(): boolean {
  if (process.argv.length === 1) {
    return false;
  }

  const appFolder = path.resolve(process.execPath, "..");
  const rootAtomFolder = path.resolve(appFolder, "..");
  const updateDotExe = path.resolve(path.join(rootAtomFolder, "Update.exe"));
  const exeName = path.basename(process.execPath);

  const spawn = function (command: any, args: any) {
    let spawnedProcess;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {
        detached: true,
      });
    } catch (error) {
      log.error("An error occurred " + error);
    }

    return spawnedProcess;
  };

  const spawnUpdate = function (args: any[]) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case "--squirrel-install":
    case "--squirrel-updated":
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(["--createShortcut", exeName]);

      setTimeout(electron.app.quit, 1000);
      return true;

    case "--squirrel-uninstall":
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(["--removeShortcut", exeName]);

      setTimeout(electron.app.quit, 1000);
      return true;

    case "--squirrel-obsolete":
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      electron.app.quit();
      return true;
  }

  return false;
}
//END LICENSED 1

/* eslint-enable */
