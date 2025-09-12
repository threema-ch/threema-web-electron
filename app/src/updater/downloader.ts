import log from "electron-log";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type {IncomingMessage} from "node:http";
import https from "node:https";
import path from "node:path";
import tls from "node:tls";
import {SemVer} from "semver";
import {base64ToU8a, u8aToBase64} from "../util/base64.js";
import {byteEquals} from "../util/byte.js";
import {spkiFingerprint} from "../util/cert.js";
import {getWeakRandomString} from "./random.js";
import type {UpdateMetadata} from "./UpdateMetadata.js";

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
    const writeStream = fs.createWriteStream(downloadPath);
    const fileWrittenPromise = this._waitForFinish(writeStream);

    const serverPath = `${this._basePath}/${this._updateInfoPath}`;

    await this._download(serverPath, writeStream);
    writeStream.end();

    await fileWrittenPromise;

    const metadata = await fsPromises.readFile(downloadPath, "utf8");
    log.error(`metadata is ${metadata}`);
    return metadata;
  }

  public async downloadBinary(updateMetadata: UpdateMetadata): Promise<string> {
    const downloadPath = this._getNewBinaryDownloadPath(
      updateMetadata.updateInfo.version,
    );
    const writeStream = fs.createWriteStream(downloadPath);
    const fileWrittenPromise = this._waitForFinish(writeStream);

    const serverPath = `${this._basePath}/${updateMetadata.updateInfo.binary.binaryPath}`;

    log.info(`Downloading update from ${serverPath} to ${downloadPath}`);

    await this._download(serverPath, writeStream);

    writeStream.end();

    await fileWrittenPromise;

    return downloadPath;
  }

  // Private Methods

  private async _waitForFinish(writeStream: fs.WriteStream): Promise<void> {
    return await new Promise((resolve) => {
      writeStream.on("finish", resolve);
    });
  }

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
    // Make sure the certificate is issued to the host we are connected to.
    const err = tls.checkServerIdentity(host, cert);
    if (err) {
      return err;
    }

    // Known, valid fingerprints.
    log.info(
      `Accepted fingerprints: ${this._certificateFingerprintSet.join(", ")}`,
    );
    const validFingerprints = this._certificateFingerprintSet.map((fp) =>
      base64ToU8a(fp),
    );

    // Calculate the SPKI fingerprint for this certificate.
    const fingerprint = spkiFingerprint(cert.raw, "sha256");

    log.info(
      `Validating certificate fingerprint for '${host}' (CN: '${cert.subject.CN}'): ${u8aToBase64(fingerprint)}`,
    );
    if (
      !validFingerprints.some((validFingerpint) =>
        byteEquals(fingerprint, validFingerpint),
      )
    ) {
      return new Error(
        `Certificate verification error: The public key of '${cert.subject.CN}' does not match our pinned fingerprint`,
      );
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
