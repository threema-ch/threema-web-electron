import type {I18n} from "./i18n/i18n";
import type {MessageBoxOptions} from "electron/main";
import {shell} from "electron";

const hundredTwentyDaysInMs = 120 * 24 * 60 * 60 * 1000;

export async function showOutdatedDialog(
  app: Electron.App,
  dialog: Electron.Dialog,
  locale: I18n,
): Promise<void> {
  return await new Promise((resolve) => {
    const dialogOpts = getDialogOpts(locale);
    void dialog.showMessageBox(dialogOpts).then(async ({response}) => {
      await shell.openExternal("https://threema.ch/faq/web_desktop_outdated");
      if (response === 1) {
        app.quit();
        resolve();
      }
    });
  });
}

export function appIsValid(appAge: number): boolean {
  return Date.now() - appAge < hundredTwentyDaysInMs;
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
