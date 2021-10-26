import * as path from "path";
import * as fs from "fs";
import * as log from "electron-log";

export class I18n {
  private readonly _loadedLanguage: {[key: string]: string | undefined};
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

  private _loadLanguage(locale: string): {[key: string]: string} {
    if (fs.existsSync(this._getPathForLocale(locale))) {
      return JSON.parse(
        fs.readFileSync(this._getPathForLocale(locale), "utf8"),
      );
    } else {
      return JSON.parse(fs.readFileSync(this._getPathForLocale("en"), "utf8"));
    }
  }

  private _getPathForLocale(locale: string): string {
    return path.join(__dirname, "resources", `${locale}.json`);
  }
}
