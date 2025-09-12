import fs from "node:fs";
import {resolve} from "node:path";
import {SemVer} from "semver";

export function getTitlecaseChannelName() {
  const channelName = getChannelName();
  const name = channelName.charAt(0).toUpperCase() + channelName.slice(1);

  return name;
}

export function getChannelName() {
  const pkg = getPackage();

  const version = new SemVer(pkg["version"]);
  const prereleaseChannel = version.prerelease;
  if (prereleaseChannel !== null && typeof prereleaseChannel[0] === "string") {
    return prereleaseChannel[0].toLowerCase();
  } else {
    return "latest";
  }
}

export function getVersionNumber() {
  const pkg = getPackage();
  const version = new SemVer(pkg["version"]);
  return version;
}

export function hasChannelName() {
  const pkg = getPackage();

  const version = new SemVer(pkg["version"]);
  const prereleaseChannel = version.prerelease;
  if (prereleaseChannel !== null && typeof prereleaseChannel[0] === "string") {
    return true;
  }
  return false;
}

export function getProductName(os, flavour) {
  const pkg = getPackage();
  console.log(`OS ${os} flavour ${flavour}`);
  const prodName = pkg["electron"]["buildConfigs"][os][flavour]["name"];
  return prodName;
}

export function getPackage() {
  return JSON.parse(
    fs.readFileSync(
      resolve(import.meta.dirname, "..", "..", "app", "package.json"),
    ),
  );
}

export default {
  getTitlecaseChannelName,
  getChannelName,
  getVersionNumber,
  hasChannelName,
  getProductName,
  getPackage,
};
