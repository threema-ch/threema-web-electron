import * as log from "electron-log";
import type {I18n} from "./i18n/i18n";
import type {MessageBoxOptions} from "electron/main";
import {shell} from "electron";

const hundredEightyDaysInMs = 180 * 24 * 60 * 60 * 1000;

export async function showOutdatedDialog(
  app: Electron.App,
  dialog: Electron.Dialog,
  locale: I18n,
): Promise<void> {
  return await new Promise((resolve) => {
    const dialogOpts = getDialogOpts(locale);
    dialog
      .showMessageBox(dialogOpts)
      .then(async ({response}) => {
        await shell
          .openExternal("https://threema.ch/faq/web_desktop_outdated")
          .catch((error) => {
            log.error(`An error ocurred while openining support URL: ${error}`);
          });
        if (response === 1) {
          app.quit();
          resolve();
        }
      })
      .catch((error) => {
        log.error(
          `An error occurred while trying to show a dialogue: ${error}`,
        );
      });
  });
}

export function appIsValid(appAge: number): boolean {
  return Date.now() - appAge < hundredEightyDaysInMs;
}

function getDialogOpts(locale: I18n): MessageBoxOptions {
  const dialogOpts = {
    type: "info",
    buttons: [
      locale.localized("ignoreOutdatedButton"),
      locale.localized("getHelpButton"),
    ],
    title: locale.localized("outdatedAppTitle"),
    message: locale.localized("outdatedAppTitle"),
    detail: locale.localized("outdatedAppDetail"),
  };

  return dialogOpts;
}
