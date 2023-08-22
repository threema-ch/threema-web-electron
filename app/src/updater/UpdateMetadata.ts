import * as fs from "fs";
import * as log from "electron-log";
import * as minisignVerify from "@threema/wasm-minisign-verify";
import {isRecord} from "../util/record";
import {isString} from "../util/string";
import {isNumber} from "../util/number";

export interface UpdateInfo {
  version: string;
  binary: BinaryMetadata;
  releaseNotes: string;
  timestamp: string | number;
}

export interface BinaryMetadata {
  binaryPath: string;
  binarySignature: string;
}

export class UpdateMetadata {
  public readonly updateInfo: UpdateInfo;
  public readonly signature: string;

  private readonly _rawUpdateInfo: string;

  public constructor(
    rawString: string,
    private readonly _keyset: string[],
  ) {
    this._keyset = _keyset;

    // We assume that there are no newlines in the json part of the string
    const jsonEnd = rawString.search("}\n");
    const signatureStart = jsonEnd + 2;

    const rawJsonString = rawString.substring(0, jsonEnd + 1);
    this._rawUpdateInfo = rawJsonString;
    const updateInfo: unknown = JSON.parse(rawJsonString);
    if (isValidUpdateInfo(updateInfo)) {
      this.updateInfo = updateInfo;
    } else {
      throw Error("Invalid UpdateInfo provided");
    }

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

function isValidBinaryMetadata(value: unknown): value is BinaryMetadata {
  if (
    isRecord(value) &&
    "binaryPath" in value &&
    isString(value.binaryPath) &&
    "binarySignature" in value &&
    isString(value.binarySignature)
  ) {
    return true;
  }

  return false;
}

function isValidUpdateInfo(value: unknown): value is UpdateInfo {
  if (
    isRecord(value) &&
    "version" in value &&
    isString(value.version) &&
    "binary" in value &&
    isValidBinaryMetadata(value.binary) &&
    "releaseNotes" in value &&
    isString(value.releaseNotes) &&
    "timestamp" in value &&
    (isString(value.timestamp) || isNumber(value.timestamp))
  ) {
    return true;
  }

  return false;
}
