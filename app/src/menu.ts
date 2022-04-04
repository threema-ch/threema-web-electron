import {Menu, MenuItem, MenuItemConstructorOptions, shell} from "electron";
import type {I18n} from "./i18n/i18n";
import * as log from "electron-log";
import * as pack from "../package.json";

function getTemplate(locale: I18n): (MenuItemConstructorOptions | MenuItem)[] {
  const isMac = process.platform === "darwin";

  const macManu: (MenuItemConstructorOptions | MenuItem)[] = [
    {
      role: "appMenu",
      label: pack.executableName, // This is not actually the name that macOS uses. It is always taken from Info.plist from the app bundle.
      submenu: [
        {
          role: "about",
          label: `${locale.localized(`about`)} ${pack.executableName}`,
        },
        {type: "separator"},
        {role: "services"},
        {type: "separator"},
        {role: "hide", label: locale.localized(`hide`)},
        {role: "hideOthers", label: locale.localized(`hideOthers`)},
        {role: "unhide", label: locale.localized(`unhide`)},
        {type: "separator"},
        {role: "quit", label: locale.localized(`quit`)},
      ],
    },
  ];

  const appMenu: (MenuItemConstructorOptions | MenuItem)[] = [
    {
      role: "fileMenu",
      label: locale.localized(`fileMenu`),
      submenu: [
        {
          role: `quit`,
          label: locale.localized(`quit`),
        },
      ],
    },
    {
      role: "editMenu",
      label: locale.localized("editMenu"),
      submenu: [
        {role: "undo", label: locale.localized(`undo`)},
        {role: "redo", label: locale.localized(`redo`)},
        {type: "separator"},
        {role: "cut", label: locale.localized(`cut`)},
        {role: "copy", label: locale.localized(`copy`)},
        {role: "paste", label: locale.localized(`paste`)},
        {
          role: "pasteAndMatchStyle",
          label: locale.localized(`pasteAndMatchStyle`),
        },
        {role: "delete", label: locale.localized(`delete`)},
        {role: "selectAll", label: locale.localized(`selectAll`)},
      ],
    },
    {
      role: "viewMenu",
      label: locale.localized("viewMenu"),
      submenu: [
        {role: "reload", label: locale.localized(`reload`)},
        {type: "separator"},
        {role: "resetZoom", label: locale.localized(`resetZoom`)},
        {role: "zoomIn", label: locale.localized(`zoomIn`)},
        {role: "zoomOut", label: locale.localized(`zoomOut`)},
      ],
    },
    {
      role: "windowMenu",
      label: locale.localized("windowMenu"),
      submenu: [
        {role: "minimize", label: locale.localized(`minimize`)},
        {role: "zoom", label: locale.localized(`zoom`)},
      ],
    },
    {
      role: "help",
      label: locale.localized("help"),
      submenu: [
        {
          label: locale.localized(`supportLinkLabel`),
          click: (): void => {
            shell
              .openExternal("https://threema.ch/support")
              .catch((e) => log.error("Could not open support page.", e));
          },
        },
      ],
    },
  ];

  return isMac ? macManu.concat(appMenu) : appMenu;
}

export function getMenu(locale: I18n): Menu {
  return Menu.buildFromTemplate(getTemplate(locale));
}
