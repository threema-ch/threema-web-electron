const fs = require("fs");
const path = require("path");
const common = require("./packaging/common");
const {copyFile} = require("fs/promises");
const {SemVer} = require("semver");
const crypto = require("crypto");
const minisignwrapper = require("./minisign-wrapper");

async function generateDownloads() {
  const myArgs = process.argv.slice(2);
  const os = myArgs[1];
  const flavour = myArgs[2];

  const version = common.getVersionNumber();
  const channel = common.getChannelName();

  writeVersionFile(version, channel);

  const downloadsFolder = "app/build/dist-electron/downloads";

  const prodName = common
    .getProductName(os === `linux-rpm` ? `linux-deb` : os, flavour)
    .replaceAll(" ", "-");

  console.log("Product Name is ", prodName);

  const releaseName = `${prodName}-${common.getTitlecaseChannelName()}`;

  console.log("Release Name is ", releaseName);

  const downloadPath = path.join(
    downloadsFolder,
    `${releaseName}.${getDownloadExtension(os)}`,
  );

  console.log(downloadPath);

  fs.mkdirSync(downloadsFolder, {recursive: true});

  await copyFile(
    path.join(
      "app/build/dist-electron/installers",
      getDownloadFilename(os, flavour, channel, version.version),
    ),
    downloadPath,
  );

  await generateHashFor(downloadPath);
}

function writeVersionFile(version, channel) {
  const str = `${channel}-${version}`;
  const loc = path.join("app/build/dist-electron/", `version.txt`);
  const filePath = fs.createWriteStream(loc);
  filePath.write(str);
  filePath.close();
  console.log(`Write version.txt ${str} at ${loc}`);
}

async function generateHashFor(downloadPath) {
  const hash = await getSHA256(downloadPath);
  const filePath = fs.createWriteStream(`${downloadPath}.sha256`);
  filePath.write(hash);
  filePath.close();
}

async function getSHA256(filepath) {
  const sha256 = crypto.createHash("sha256");
  const stream = fs.createReadStream(filepath);

  return await new Promise((resolve, reject) => {
    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => sha256.update(chunk));
    stream.on("end", () => resolve(sha256.digest("hex")));
  });
}

async function generateMetadata() {
  const args = process.argv.slice(2);
  const os = args[1];
  const flavour = args[2];

  const version = common.getVersionNumber();
  const channel = common.getChannelName();

  writeVersionFile(version, channel);

  const updateName = `${flavour}-${channel}-${os}`;
  const binaryName = `${updateName}.${getDestinationFilenameExtension(os)}`;
  const metadataName = `${updateName}.json`;

  await copyFile(
    path.join(
      "app/build/dist-electron/installers",
      getFilename(os, flavour, channel, version.version),
    ),
    path.join(getUpdatePath(), binaryName),
  );

  console.log(getFilename(os, flavour, channel, version.version));

  const binarySignature = getSignatureForBinary(
    path.join(getUpdatePath(), binaryName),
  );

  console.log("Signed binary");

  const metadata = {};
  metadata["version"] = version.raw;
  metadata["binary"] = {
    binaryPath: binaryName,
    binarySignature: binarySignature.toString(),
  };
  metadata["releaseNotes"] = getReleaseNotes();
  metadata["timestamp"] = Math.round(new Date().getTime() / 1000);

  let stringMetadata = JSON.stringify(metadata);

  const metadataSignature = getMetadataSignature(stringMetadata);
  stringMetadata += `\n${metadataSignature}`;

  console.log("Metadata step 1");

  const updateFolder = getUpdatePath();
  fs.mkdirSync(updateFolder, {recursive: true});
  fs.promises.writeFile(path.join(updateFolder, metadataName), stringMetadata);
}

function getMetadataSignature(stringMetadataBuffer) {
  return minisignwrapper.signString(stringMetadataBuffer);
}

function getSignatureForBinary(binaryPath) {
  return minisignwrapper.signBuffer(binaryPath);
}

function getUpdatePath() {
  const updatePath = path.join("app/build/dist-electron/updates");
  fs.mkdirSync(updatePath, {recursive: true});
  return updatePath;
}

function getReleaseNotes() {
  return "";
}

function getDownloadExtension(os) {
  if (os === "macOS") {
    return `dmg`;
  } else if (os === "windows") {
    return `exe`;
  } else if (os === "linux-deb") {
    return `deb`;
  } else if (os === "linux-rpm") {
    return `rpm`;
  } else {
    throw new Error(`Unsupported OS ${os}`);
  }
}

function getDownloadFilename(os, flavour, channel, version) {
  if (os === "macOS") {
    return getMacOSDownloadFilename(flavour, channel);
  } else if (os === "windows") {
    return getWindowsDownloadFilename(flavour, channel, version);
  } else if (os === "linux-deb") {
    return getLinuxDebFilename(flavour, channel, version);
  } else if (os === "linux-rpm") {
    return getLinuxRPMFilename(flavour, channel, version);
  } else {
    throw new Error(`Unsupported OS ${os}`);
  }
}

function getLinuxRPMFilename(flavour, channel, version) {
  const pack = common.getPackage();
  const appDirName = pack["electron"]["buildConfigs"]["linux-deb"][flavour][
    "name"
  ].replaceAll(" ", "-");
  console.log(`appDirName ${appDirName}`);
  const versionString = getLinuxRPMVersionString(version, channel);
  const name = `${appDirName}${getRPMChannel()}${versionString}-1.amd64.rpm`;
  console.log("name");
  return name;
}

function getRPMChannel() {
  if (common.hasChannelName()) {
    return `-${common.getTitlecaseChannelName()}-`;
  } else {
    return `-`;
  }
}

function getLinuxDebFilename(flavour, channel, version) {
  const versionString = getLinuxDebVersionString(version, channel);
  let name = "";
  if (flavour === "consumer") {
    name = `threema${getDebChannel()}${versionString}_amd64.deb`;
  } else {
    name = `threema-${flavour}${getDebChannel()}${versionString}_amd64.deb`;
  }
  console.log("name");
  return name;
}

function getDebChannel() {
  if (common.hasChannelName()) {
    return `-${common.getChannelName()}_`;
  } else {
    return `_`;
  }
}

function getWindowsDownloadFilename(flavour, channel, version) {
  const versionString = getWindowsVersionString(version, channel);
  if (flavour === "consumer") {
    return `threema_web${versionString}-setup.exe`;
  } else {
    return `threema_${flavour}_web${versionString}-setup.exe`;
  }
}

function getFilename(os, flavour, channel, version) {
  if (os === "macOS") {
    return getMacOSFilename(flavour, channel);
  } else if (os === "windows") {
    return getWindowsFilename(flavour, channel, version);
  } else {
    throw new Error(`Unsupported OS ${os}`);
  }
}

function getMacOSFilename(flavour, channel) {
  const pack = common.getPackage();
  const zipname = pack["electron"]["buildConfigs"]["macOS"][flavour]["zipName"];
  console.log(`Flavour is ${flavour}`);
  if (common.hasChannelName()) {
    return `${zipname}-${channel}.zip`;
  } else {
    return `${zipname}.zip`;
  }
}

function getMacOSDownloadFilename(flavour, channel) {
  const pack = common.getPackage();
  const zipname = pack["electron"]["buildConfigs"]["macOS"][flavour]["name"];
  console.log(`Flavour is ${flavour}`);
  if (common.hasChannelName()) {
    return `${`${zipname} ${common.getTitlecaseChannelName()}`.substring(
      0,
      26,
    )}.dmg`;
  } else {
    return `${`${zipname}`.substring(0, 26)}.dmg`;
  }
}

function getWindowsFilename(flavour, channel, version) {
  const versionString = getWindowsVersionString(version, channel);
  if (flavour === "consumer") {
    return `threema_web${versionString}-full.nupkg`;
  } else {
    return `threema_${flavour}_web${versionString}-full.nupkg`;
  }
}

function getWindowsVersionString(version, channel) {
  const semVersion = new SemVer(version);
  if (common.hasChannelName()) {
    return `_${channel}-${semVersion.major}.${semVersion.minor}.${
      semVersion.patch
    }-${common.getChannelName()}`;
  } else {
    return `-${semVersion.major}.${semVersion.minor}.${semVersion.patch}`;
  }
}

function getLinuxDebVersionString(version, channel) {
  const semVersion = new SemVer(version);
  const versionedChannel = semVersion.prerelease.join(".");
  if (common.hasChannelName()) {
    return `${semVersion.major}.${semVersion.minor}.${semVersion.patch}~${versionedChannel}`;
  } else {
    return `${semVersion.major}.${semVersion.minor}.${semVersion.patch}`;
  }
}

function getLinuxRPMVersionString(version, channel) {
  const semVersion = new SemVer(version);
  const versionedChannel = semVersion.prerelease.join(".");
  if (common.hasChannelName()) {
    return `${semVersion.major}.${semVersion.minor}.${semVersion.patch}.${versionedChannel}`;
  } else {
    return `${semVersion.major}.${semVersion.minor}.${semVersion.patch}`;
  }
}

function getDestinationFilenameExtension(os) {
  if (os === "macOS") {
    return "zip";
  } else {
    return "nupkg";
  }
}

function main() {
  const myArgs = process.argv.slice(2);
  if (myArgs[0] === "downloads") {
    generateDownloads();
  } else if (myArgs[0] === "updates") {
    generateMetadata();
  } else {
    throw new Error("first argument not recognized");
  }
}

if (require.main === module) {
  main();
}
