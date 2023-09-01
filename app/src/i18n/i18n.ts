import * as path from "path";
import * as fs from "fs";
import * as log from "electron-log";
import {isRecordWhere} from "../util/record";
import {isOptionalString, isString} from "../util/string";

export class I18n {
  private readonly _loadedLanguage: Record<string, string | undefined>;
  private readonly _locale: string;

  public constructor(locale: string) {
    log.info(`Loading locale ${locale}`);
    const nonEmptyLocale = locale === "" ? `en` : locale;
    this._loadedLanguage = this._loadLanguage(nonEmptyLocale);
    this._locale = nonEmptyLocale;
  }

  public localized(phrase: string): string {
    const translation = this._loadedLanguage[phrase];
    if (translation === undefined) {
      log.error(
        `Could not get translation for ${phrase} with locale ${this._locale}`,
      );
      return phrase;
    } else {
      return translation;
    }
  }

  private _loadLanguage(locale: string): Record<string, string | undefined> {
    const exists = fs.existsSync(this._getPathForLocale(locale));
    const translation: unknown = JSON.parse(
      exists
        ? fs.readFileSync(this._getPathForLocale(locale), "utf8")
        : fs.readFileSync(this._getPathForLocale("en"), "utf8"),
    );

    if (
      isRecordWhere(
        {
          key: isString,
          value: isOptionalString,
        },
        translation,
      )
    ) {
      return translation;
    }

    // This shouldn't happen, but if even the fallback language (`en`) is
    // missing, don't return any translation strings.
    return {};
  }

  private _getPathForLocale(locale: string): string {
    return path.join(__dirname, "resources", `${locale}.json`);
  }
}
