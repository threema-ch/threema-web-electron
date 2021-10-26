import * as https from "https";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import type {UpdateMetadata} from "./UpdateMetadata";
import {SemVer} from "semver";
import * as log from "electron-log";
import type {IncomingMessage} from "http";
import * as tls from "tls";
import {getWeakRandomString} from "./random";

export class Downloader {
  public constructor(
    private readonly _hostname: string,
    private readonly _basePath: string,
    private readonly _updateInfoPath: string,
    public readonly downloadFolder: string,
    private readonly _certificateFingerprintSet: string[],
  ) {}

  public async downloadUpdateInfo(): Promise<string> {
    const downloadPath = this._getNewUpdateInfoDownloadPath();
    const filePath = fs.createWriteStream(downloadPath);

    const serverPath = `${this._basePath}/${this._updateInfoPath}`;

    await this._download(serverPath, filePath);
    filePath.end();
    const metadata = await fsPromises.readFile(downloadPath, "utf8");
    log.error(`metadata is ${metadata}`);
    return metadata;
  }

  public async downloadBinary(updateMetadata: UpdateMetadata): Promise<string> {
    const downloadPath = this._getNewBinaryDownloadPath(
      updateMetadata.updateInfo.version,
    );
    const filePath = fs.createWriteStream(downloadPath);

    const serverPath = `${this._basePath}/${updateMetadata.updateInfo.binary.binaryPath}`;

    log.info(`Downloading update from ${serverPath} to ${downloadPath}`);

    await this._download(serverPath, filePath);
    filePath.end();

    return downloadPath;
  }

  // Private Methods

  private async _download(
    downloadPath: string,
    writeStream: fs.WriteStream,
  ): Promise<void> {
    const options: https.RequestOptions = {
      hostname: this._hostname,
      method: "GET",
      port: 443,
      path: downloadPath,
      agent: new https.Agent({
        maxCachedSessions: 0,
      }),
      // @ts-expect-error: TODO https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/55949tls
      checkServerIdentity: this._checkServerIdentity.bind(this),
    };

    return await new Promise((resolve, reject) => {
      log.info("Starting request");

      const req = https.request(options, (res: IncomingMessage) => {
        res.pipe(writeStream);

        log.info(`Status code: ${res.statusCode}`);
        if (res.statusCode !== 200) {
          reject(new Error(`Unexpected status code ${res.statusCode}`));
        }

        res.on("error", (err: Error) => {
          log.error("We have encountered an error:", err);
          reject(err);
        });

        res.on("end", () => {
          log.error("We are done!");
          resolve();
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.on("abort", () => {
        reject(new Error("Request was aborted"));
      });

      req.end();
    });
  }

  // This function was copied from the Node.js docs (https://nodejs.org/api/https.html#https_https_request_options_callback)
  // You gotta check whether this can be used or has to changed
  private _checkServerIdentity(
    host: string,
    cert: tls.PeerCertificate,
  ): Error | undefined {
    // Make sure the certificate is issued to the host we are connected to
    const err = tls.checkServerIdentity(host, cert);
    if (err) {
      return err;
    }

    // Pin the public key, similar to HPKP pin-sha256 pinning
    const pk = crypto
      .createHash("sha256")
      // @ts-expect-error: TODO https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/55949tls
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .update(cert.pubkey)
      .digest("base64")
      .toString();
    if (!this._certificateFingerprintSet.includes(pk)) {
      const msg =
        "Certificate verification error: " +
        `The public key of '${cert.subject.CN}' ` +
        "does not match our pinned fingerprint";
      return new Error(msg);
    }

    return undefined;
  }

  // Helper Methods

  private _getNewBinaryDownloadPath(versionNumber: string): string {
    fs.mkdirSync(this.downloadFolder, {recursive: true});

    const platform = process.platform;
    if (platform === "darwin") {
      return this._getNewMacOsDownloadPath(versionNumber);
    } else if (platform === "win32") {
      return this._getNewWindowsDownloadPath(versionNumber);
    } else {
      throw new Error("Unsupported platform for auto updates");
    }
  }

  private _getNewMacOsDownloadPath(versionNumber: string): string {
    return path.join(this.downloadFolder, `${getWeakRandomString()}.zip`);
  }

  private _getNewWindowsDownloadPath(versionNumber: string): string {
    const semver = new SemVer(versionNumber);

    return `${path.join(
      this.downloadFolder,
      `threema_web_desktop-${semver.major}.${semver.minor}.${semver.patch}-full`,
    )}.nupkg`;
  }

  private _getNewUpdateInfoDownloadPath(): string {
    fs.mkdirSync(this.downloadFolder, {recursive: true});
    return path.join(this.downloadFolder, `${getWeakRandomString()}.json`);
  }
}
