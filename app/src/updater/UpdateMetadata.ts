import * as fs from "fs";
import * as log from "electron-log";
import * as minisignVerify from "@threema/wasm-minisign-verify";

export interface UpdateInfo {
  version: string;
  binary: BinaryMetadata;
  releaseNotes: string;
  timestamp: string;
}

export interface BinaryMetadata {
  binaryPath: string;
  binarySignature: string;
}

export class UpdateMetadata {
  public readonly updateInfo: UpdateInfo;
  public readonly signature: string;

  private readonly _rawUpdateInfo: string;

  public constructor(rawString: string, private readonly _keyset: string[]) {
    this._keyset = _keyset;

    // We assume that there are no newlines in the json part of the string
    const jsonEnd = rawString.search("}\n");
    const signatureStart = jsonEnd + 2;

    const rawJsonString = rawString.substring(0, jsonEnd + 1);
    this._rawUpdateInfo = rawJsonString;
    this.updateInfo = JSON.parse(rawJsonString);

    if (signatureStart >= rawString.length) {
      this.signature = "";
      return;
    }

    this.signature = rawString.substring(signatureStart, rawString.length);
  }

  public containsValidMetadataSignature(): boolean {
    let checkPassed = false;

    for (let i = 0; i < this._keyset.length && !checkPassed; i++) {
      checkPassed = UpdateMetadata._checkBufferSignature(
        Buffer.from(this._rawUpdateInfo),
        this._keyset[i],
        this.signature,
      );
    }

    return checkPassed;
  }

  public blobContainsValidSignature(url: string): boolean {
    let checkPassed = false;

    const fileBuffer = fs.readFileSync(url);
    const binarySig = this.updateInfo.binary.binarySignature;

    for (let i = 0; i < this._keyset.length && !checkPassed; i++) {
      checkPassed = UpdateMetadata._checkBufferSignature(
        fileBuffer,
        this._keyset[i],
        binarySig,
      );
    }

    return checkPassed;
  }

  private static _checkBufferSignature(
    signedData: Buffer,
    rawPublicKey: string,
    signature: string,
  ): boolean {
    minisignVerify.setupLogging("info");
    try {
      const publicKey = minisignVerify.PublicKey.decode(rawPublicKey);
      const sigInfo = minisignVerify.Signature.decode(signature);
      return publicKey.verify(signedData, sigInfo);
    } catch (err) {
      log.error(`Verification failed: ${err}`);
      return false;
    }
  }
}
