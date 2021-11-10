import {app, AutoUpdater, Dialog} from "electron";
import {Downloader} from "./downloader";
import * as fs from "fs";
import * as crypto from "crypto";
import {UpdateMetadata, UpdateInfo} from "./UpdateMetadata";
import * as semver from "semver";
import * as path from "path";
import * as pack from "../../package.json";
import * as log from "electron-log";
import type {MessageBoxOptions} from "electron/main";
import {getWeakRandomString} from "./random";
import type {I18n} from "../i18n/i18n";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * The updater downloads app version metadata and binaries from a given update server.
 * It verifies that the update server uses a TLS certificate from a given set of certificates before
 * downloading any update information.
 * The app version metadata needs to be signed and the signature is checked.
 * The app update binaries are only downloaded if the metadata passes the signature check and are
 * themselves also checked with the signature given in the metadata.
 *
 * If the update data is valid, new metadata is generated and – together with the binary – is handed to the electron auto updater for installation.
 *
 */
export class Updater {
  private readonly _downloader: Downloader;
  private _isRunning = false;
  private _currentlyQueuedVersionNumber?: string;
  private _updateErrorShown = false;
  private _isSuspended = false;

  public constructor(
    private readonly _currentVersion: string,
    private readonly _tempFolder: string,
    certificateSet: string[],
    private readonly _autoUpdater: AutoUpdater,
    powerMonitor: Electron.PowerMonitor,
  ) {
    Updater._deleteExistingDownloadFolder(this._tempFolder);

    this._handlePowerMonitor(powerMonitor);

    this._downloader = new Downloader(
      pack.updateServer.hostname,
      pack.updateServer.path,
      this._getUpdateMetadataFilename(),
      this._getNewDownloadFolder(this._tempFolder),
      certificateSet,
    );
  }

  /**
   * Requests the application version metadata from the server and downloads the update files
   * if a newer version is available on the server and not already queued by the user. The update
   * files are then passed onto the electron updater along with the necessary metadata.
   * @param  {Dialog} dialog
   * @returns Promise
   */
  public async checkAndDownloadUpdates(
    dialog: Dialog,
    locale: I18n,
  ): Promise<void> {
    if (!this._isRunning && !this._isSuspended) {
      this._isRunning = true;

      try {
        const updateInfo = await this._checkAndInstallUpdates(
          dialog,
          locale,
          this._currentVersion,
          this._downloader,
          this._autoUpdater,
        );

        if (updateInfo === undefined) {
          log.info("No update available");
          this._isRunning = false;
          return;
        }

        this._autoUpdater.on(
          "update-downloaded",
          (
            event: Event,
            releaseNotes: string,
            releaseName: string,
            releaseDate: Date,
            updateUrl: string,
          ) => {
            const nonEmptyReleaseNotes =
              releaseNotes === "" ? releaseNotes : undefined;
            log.info(`Update downloaded from ${updateUrl}`);
            this._isRunning = false;
            this._currentlyQueuedVersionNumber = updateInfo.version;
            this._showUpdateDialog(dialog, locale, nonEmptyReleaseNotes);
          },
        );
      } catch (error) {
        log.error("We have encountered an error: ", error);
        this._showUpdateErrorDialog(dialog, locale);
        this._isRunning = false;
      }

      this._autoUpdater.on("error", (error: Error) => {
        log.error("Auto update error", error);
        this._isRunning = false;
      });
    }
  }

  /**
   * Shows an error dialog explaining where to get news about this application.
   * Should be used if the update fails due to an incorrect update file or because the server
   * cannot be reached.
   * Should not point to support.
   *
   * @param  {Dialog} dialog
   */
  private _showUpdateErrorDialog(dialog: Dialog, locale: I18n): void {
    if (!this._updateErrorShown) {
      this._updateErrorShown = true;
      const dialogOpts = {
        type: "error",
        buttons: [locale.localized("okButton")],
        title: locale.localized("updateAvaiableDialogeTitle"),
        message: locale.localized("updateFailedMessage"),
        detail: locale.localized("updateFailedDetailMessage"),
      };

      dialog
        .showMessageBox(dialogOpts)
        .then(({response}) => {
          if (response === 0) {
            log.info("User confirmed");

            setTimeout(() => {
              this._updateErrorShown = false;
            }, 15 * MINUTE);
          }
        })
        .catch((error) => {
          log.error(
            `An error occurred while trying to show a dialogue: ${error}`,
          );
        });
    }
  }

  private _showUpdateDialog(
    dialog: Dialog,
    locale: I18n,
    releaseNotes: string | undefined,
  ): void {
    const dialogOpts = this._getDialogOpts(releaseNotes, locale);

    dialog
      .showMessageBox(dialogOpts)
      .then(({response}) => {
        if (response === 0) {
          this._autoUpdater.quitAndInstall();
        }
      })
      .catch((error) => {
        log.error(
          `An error occurred while trying to show a dialogue: ${error}`,
        );
      });
  }

  /**
   * Returns the path to the folder into which update files are downloaded
   *
   * @param  {string} tempFolder The temporary directory for the current environment
   * @returns string
   */
  private _getNewDownloadFolder(tempFolder: string): string {
    let updateFolder = Updater._getUpdateParentFolder(tempFolder);
    if (Updater._platformAllowsAutoupdates()) {
      updateFolder = path.join(updateFolder, getWeakRandomString());
    } else {
      throw new Error("Updates are not allowed on this platform!");
    }
    fs.mkdirSync(updateFolder, {recursive: true});

    return updateFolder;
  }

  /**
   * Deletes all existing download folders.
   *
   * @param  {string} tempFolder
   */
  private static _deleteExistingDownloadFolder(tempFolder: string): void {
    const updateFolder = Updater._getUpdateParentFolder(tempFolder);
    if (fs.existsSync(updateFolder)) {
      try {
        fs.rmdirSync(updateFolder, {recursive: true});
      } catch (err) {
        log.error(
          `An error occurred while cleaning the download folder. Error: ${err}`,
        );
      }
    }
  }

  private _getDialogOpts(
    releaseNotes: string | undefined,
    locale: I18n,
  ): MessageBoxOptions {
    const dialogOpts = {
      type: "info",
      buttons: [locale.localized("restart"), locale.localized("later")],
      title: `${locale.localized("updateDialogTitle")} ${pack.executableName}`,
      message: locale.localized("updateDialogDetail"),
      detail: releaseNotes ?? locale.localized("noReleaseNotesAvailable"),
    };

    return dialogOpts;
  }

  /**
   * Returns the general update download folder in which a folder for a specific update can be
   * created.
   *
   * @param  {string} tempFolder
   * @returns string
   */
  private static _getUpdateParentFolder(tempFolder: string): string {
    if (Updater._platformAllowsAutoupdates()) {
      return path.join(
        tempFolder,
        `ch.threema-web-${pack.flavour}-desktop`,
        "updates",
      );
    } else {
      throw new Error("Updates are not allowed on this platform!");
    }
  }

  private async _checkAndInstallUpdates(
    dialog: Dialog,
    locale: I18n,
    currentVersion: string,
    downloader: Downloader,
    autoUpdater: AutoUpdater,
  ): Promise<UpdateInfo | undefined> {
    // Download the app version information
    const rawUpdateInfo = await downloader.downloadUpdateInfo();

    if (rawUpdateInfo === "") {
      this._showUpdateErrorDialog(dialog, locale);
      throw new Error("Could not get update info");
    }

    const updateMetadata = new UpdateMetadata(
      rawUpdateInfo,
      pack.updateSignatureKeyset,
    );
    const metadataSignatureCheckPassed =
      updateMetadata.containsValidMetadataSignature();

    if (!metadataSignatureCheckPassed) {
      const message = "Metadata did not pass signature check";
      log.error(message);
      throw new Error(message);
    }

    // Check whether the version on the server is both newer than the currently installed version and
    // newer than the version that is currently queued for updating.
    const updateAvailable = this._updateAvailable(
      currentVersion,
      updateMetadata.updateInfo,
    );

    if (this._updateAlreadyQueued(updateMetadata.updateInfo)) {
      this._showUpdateDialog(
        dialog,
        locale,
        updateMetadata.updateInfo.releaseNotes,
      );
      return undefined;
    }

    if (!updateAvailable) {
      log.info("Updater: No update available");
      return undefined;
    }

    // Delete all already downloaded updates in our update download folder
    Updater._deleteExistingDownloadFolder(this._tempFolder);

    // Download the binary for this update and check the signature
    const downloadedFile = await downloader.downloadBinary(updateMetadata);

    const signatureCheckPassed = this._checkSignature(
      updateMetadata,
      downloadedFile,
    );

    if (!signatureCheckPassed) {
      const message = "Update did not pass signature check";
      log.error(message);
      throw new Error(message);
    }

    // Create metadata required by squirrel and hand the update to the electron autoupdater
    // which will then hand it to squirrel for updating.

    const squirrelMetadataUrl = await this._createSquirrelUpdateMetadata(
      downloader,
      downloadedFile,
    );
    log.info(`Set auto updater path to ${squirrelMetadataUrl}`);

    try {
      autoUpdater.setFeedURL({url: squirrelMetadataUrl});

      // Squirrel on macOS does not seem handle update requests directly after startup.
      // Due to network delays, this will most likely be a rare issue. This timeout
      // fixes it nevertheless.
      // This is the only value for the timeout that we tried. A shorter or longer
      // timeout may work as well.
      await new Promise((r) => {
        setTimeout(r, 2000);
      });

      autoUpdater.checkForUpdates();

      return updateMetadata.updateInfo;
    } catch (error) {
      log.error(`An error occurred while trying to apply the update ${error}`);
      this._currentlyQueuedVersionNumber = undefined;

      // Remove any downloads if the update is rejected by the electron autoupdater
      // This will cause the update to be downloaded again on the next update check.
      // A general update failed warning will be shown to the user.
      Updater._deleteExistingDownloadFolder(this._tempFolder);

      throw new Error(
        `An error occurred when downloading the update ${error}: ${JSON.stringify(
          updateMetadata.updateInfo,
        )}`,
      );
    }
  }

  private async _createSquirrelUpdateMetadata(
    downloader: Downloader,
    downloadedFile: string,
  ): Promise<string> {
    const updateFolder = downloader.downloadFolder;
    const updateMetadataFilename =
      this._createUpdateMetadataFilename(updateFolder);

    const updateString = await this._createUpdateString(downloadedFile);

    log.log(`Update json is ${updateString}`);

    const filePath = fs.createWriteStream(updateMetadataFilename);
    filePath.write(updateString);
    filePath.close();

    let url = updateFolder;
    if (process.platform === "darwin") {
      url = `file://${updateMetadataFilename}`;
    }

    return url;
  }

  private _updateAlreadyQueued(updateInfoJson: UpdateInfo): boolean {
    if (this._currentlyQueuedVersionNumber !== undefined) {
      return !Updater.checkSmallerVersionNumber(
        this._currentlyQueuedVersionNumber,
        updateInfoJson.version,
      );
    }
    return false;
  }

  private _updateAvailable(
    currentVersion: string,
    updateInfoJson: UpdateInfo,
  ): boolean {
    return Updater.checkSmallerVersionNumber(
      currentVersion,
      updateInfoJson.version,
    );
  }

  private _createUpdateMetadataFilename(updateFolder: string): string {
    const platform = process.platform;
    if (platform === "darwin") {
      return path.join(updateFolder, "update.json");
    } else if (platform === "win32") {
      return path.join(updateFolder, "RELEASES");
    } else {
      const err = new Error("Unsupported platform for auto updates");
      log.error(err);
      throw err;
    }
  }
  /**
   * Creates a string containing the information needed by squirrel to update the app
   *
   * @param  {string} filepath The full path to the update binary
   * @returns Promise
   */
  private async _createUpdateString(filepath: string): Promise<string> {
    const platform = process.platform;
    if (platform === "darwin") {
      return this._getDarwinUpdateString(filepath);
    } else if (platform === "win32") {
      return await this._getWindowsUpdateString(filepath);
    } else {
      const err = new Error("Unsupported platform for auto updates");
      log.error(err);
      throw err;
    }
  }

  private async _getWindowsUpdateString(filepath: string): Promise<string> {
    const hash = await Updater._getSha1(filepath);
    const fileSize = this._getSizeOfFile(filepath);
    const filename = filepath.substring(filepath.lastIndexOf("\\") + 1);
    log.info(`Filename is ${filename}`);

    const updateString = `${hash} ${filename} ${fileSize}`;
    return updateString;
  }

  private _getSizeOfFile(filePath: string): string {
    const stats = fs.statSync(filePath);
    return `${stats.size}`;
  }

  // This is required to generate the RELEASES file for Squirrel on Windows
  // All updates are separately checked; Assuming that our checks work correctly, using SHA1 is not
  // unsafe in this instance.
  // More information about the RELEASES file for Squirrel on Windows is available at
  // https://github.com/Squirrel/Squirrel.Windows/blob/76c87af6f389bea69576c738ef46574b2945b0ba/docs/using/update-process.md
  private static async _getSha1(filepath: string): Promise<string> {
    const sha1 = crypto.createHash("sha1");
    const stream = fs.createReadStream(filepath);

    return await new Promise((resolve, reject) => {
      stream.on("error", (err: Error) => reject(err));
      stream.on("data", (chunk: crypto.BinaryLike) => sha1.update(chunk));
      stream.on("end", () => resolve(sha1.digest("hex")));
    });
  }

  private _getDarwinUpdateString(filepath: string): string {
    const binaryFileUrl = `file://${filepath}`;
    return JSON.stringify({url: binaryFileUrl});
  }

  /**
   * Checks whether the version number given in currentVersion is smaller than the version number
   * given in UpdateInfo. If it is smaller true is returned. If it is larger or equal false is returned.
   *
   * @param  {string} currentVersion
   * @param  {UpdateInfo} updateInfo
   * @returns Promise
   */
  public static checkSmallerVersionNumber(
    currentVersion: string,
    newVersion: string,
  ): boolean {
    const isValid = semver.valid(newVersion) !== null;
    const isNewer = semver.lt(currentVersion, newVersion, {
      includePrerelease: true,
    });

    return isValid && isNewer;
  }

  // Helper functions

  private _handlePowerMonitor(powerMonitor: Electron.PowerMonitor): void {
    powerMonitor.on("suspend", () => {
      this._isSuspended = true;
    });
    powerMonitor.on("resume", () => {
      this._isSuspended = false;
    });
  }

  private _getUpdateMetadataFilename(): string {
    const channel = this._getChannelName();
    const flavour = this._getFlavour();
    const os = this._getOs();

    return `${flavour}-${channel}-${os}.json`;
  }

  private _getOs(): string {
    if (process.platform === "darwin") {
      return "macOS";
    } else {
      return "windows";
    }
  }

  private _getFlavour(): string {
    return pack.flavour;
  }

  private _getChannelName(): string {
    const prereleaseChannel = semver.prerelease(app.getVersion());
    if (
      prereleaseChannel !== null &&
      typeof prereleaseChannel[0] === "string"
    ) {
      return prereleaseChannel[0];
    } else {
      return "latest";
    }
  }

  private _checkSignature(
    updateInfo: UpdateMetadata,
    filePath: string,
  ): boolean {
    return updateInfo.blobContainsValidSignature(filePath);
  }

  private static _platformAllowsAutoupdates(): boolean {
    return process.platform === "win32" || process.platform === "darwin";
  }
}
