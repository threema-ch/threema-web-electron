import {notarize} from "@electron/notarize";
import {sign} from "@electron/osx-sign";
import packager from "@electron/packager";
import {populateIgnoredPaths} from "@electron/packager/dist/copy-filter.js";
import {makeUniversalApp} from "@electron/universal";
import debug from "debug";
import fs from "node:fs";
import path from "node:path";
import {SemVer} from "semver";
import {
  getChannelName,
  getTitlecaseChannelName,
  hasChannelName,
} from "./packaging/common.js";
import {signWindowsBinaryOrPackage} from "./signing/sign-windows.js";

const DEV_ENV = process.env.DEV_ENV;
const log = debug("dist-electron");

let packageName = "";

function allow(directory, pattern) {
  return (path_) => {
    if (path_ === directory) {
      // It is the path itself
      // -> Continue walking recursively
      return "allow";
    }

    if (path_.startsWith(directory)) {
      // It is within path
      // -> Continue walking recursively if allowed by the pattern
      if (path_.replace(directory, "").match(pattern)) {
        return "allow";
      } else {
        return "continue";
      }
    }

    const parts = directory.split("/");
    for (const index of parts.keys()) {
      const sub = parts.slice(0, index + 1).join("/");
      if (path_ === sub) {
        // It is a sub-path of path
        // -> Continue walking recursively
        return "allow";
      }

      if (!path_.startsWith(`${sub}/`)) {
        // It is either not a sub-path of path or a file not within path
        // -> Stop walking recursively
        return "continue";
      }
    }

    // It is not within path
    // -> Stop walking recursively
    return "continue";
  };
}

async function buildPackage(pkg, os, flavour) {
  const options = {};
  populateIgnoredPaths(options);

  const osConfig = pkg.electron.buildConfigs[os][flavour];

  // Build allow-list
  const allowances = Object.entries(pkg.electron.dist.include || {}).map(
    ([directory, pattern]) => allow(directory, new RegExp(pattern, "u")),
  );
  log("#Rules:", allowances.length);

  packageName = osConfig["name"];
  let executableName = osConfig["executableName"];

  const version = new SemVer(pkg["version"]);

  const prereleaseChannel = version.prerelease;
  if (typeof prereleaseChannel[0] === "string" && prereleaseChannel[0] !== "") {
    packageName += ` ${getTitlecaseChannelName()}`;
    executableName += `-${getChannelName()}`;
  }

  // Package
  // This will return true if the directory already exists.
  const outputPaths = await packager({
    name: packageName,
    // The exectable name does not apply to macOS. For macOS the name is used.
    executableName,
    appBundleId: executableName,
    dir: path.resolve(import.meta.dirname, "..", "app"),
    out: path.resolve(
      import.meta.dirname,
      "..",
      "app",
      "build",
      "dist-electron",
      "packaged",
    ),
    prune: true,
    overwrite: true,
    asar: true,
    arch: osConfig["arch"],
    platform: osConfig["platform"],
    icon: osConfig["iconPath"],
    extendInfo: {
      LSFileQuarantineEnabled: true,
      LSFileQuarantineExcludedPathPatterns: ["~/Library/*"],
    },
    ignore: (path_) => {
      // Deny: Default rules from electron-packager
      if (options.ignore.some((rule) => path_.match(rule))) {
        log(" !", path_);
        return true;
      }

      // Deny: dotfiles
      if (path_.match(/\/\..+$/u)) {
        log(" !", path_);
        return true;
      }

      // Go through rules list
      for (const command of allowances) {
        switch (command(path_)) {
          case "allow":
            // Allowed: Continue walking recursively
            log(" +", path_);
            return false;
          case "deny":
            // Denied: Stop walking recursively
            log(" -", path_);
            return true;
          case "continue":
            // No decision: Continue traversing ruleset
            log(" ?", path);
            break;
          default:
            throw new Error("Unknown reply");
        }
      }

      // Default: Block
      log("  ", path_);
      return true;
    },
  });

  if (osConfig["platform"] === "darwin") {
    const universalOutputPath = `${path.resolve(
      import.meta.dirname,
      "..",
      "app",
      "build",
      "dist-electron",
      "packaged",
      `${packageName}-darwin-universal`,
    )}`;

    await makeUniversalApp({
      x64AppPath: `${outputPaths[0]}/${packageName}.app`,
      arm64AppPath: `${outputPaths[1]}/${packageName}.app`,
      outAppPath: `${universalOutputPath}/${packageName}.app`,
      force: true,
    });

    outputPaths.push(universalOutputPath);

    if (!(DEV_ENV === "development")) {
      for (const outputPath of outputPaths) {
        await macOSSign(outputPath);
        await macOSNotarize(outputPath);
      }
    }
  }

  if (osConfig["platform"] === "win32") {
    if (!(DEV_ENV === "development")) {
      for (const outputPath of outputPaths) {
        console.log(`Signing app binary for ${executableName}`);
        signWindowsBinaryOrPackage(
          path.join(`${outputPath}`, `${executableName}.exe`),
          flavour,
        );
      }
    }
  }

  console.info(`Packaged: ${outputPaths}`);
}

async function macOSNotarize(outputPath) {
  console.log(`Start notarizing at ${new Date().toLocaleTimeString()}`);
  console.log(
    "Notarization can take a long time. Expect anything between 2 and 35 minutes. ",
  );
  await notarize({
    tool: "notarytool",
    appPath: path.join(`${outputPath}`, `${packageName}.app`),
    appleId: process.env.NOTARIZE_APPLE_ID,
    appleIdPassword: process.env.NOTARIZE_APPLE_ID_PASSWORD,
    teamId: process.env.NOTARIZE_TEAM_ID,
  });

  console.log(`Finished notarizing at ${new Date().toLocaleTimeString()}`);
}

async function macOSSign(outputPath) {
  console.log("Start signing");

  await sign({
    "app": path.join(`${outputPath}`, `${packageName}.app`),
    "identity": "Developer ID Application: Threema GmbH (DL5SR3PBJC)",
    "entitlements": "app/src/entitlements.plist",
    "gatekeeper-assess": true,
    "binaries": [],
    "entitlements-inherit": "app/src/entitlements.plist",
    "hardened-runtime": true,
    "signature-flags": "library",
  });
}

function preparePackage(os, flavour) {
  console.log(`Prepare package for ${os} ${flavour}`);
  // Load package.json
  const pack = path.resolve(import.meta.dirname, "..", "app", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pack));
  const osConfig = pkg.electron.buildConfigs[os][flavour];

  packageName = osConfig["name"];
  let executableName = osConfig["executableName"];

  if (hasChannelName()) {
    packageName += ` ${getTitlecaseChannelName()}`;
    executableName += `-${getChannelName()}`;
  }

  const conf = JSON.parse(
    fs.readFileSync(
      path.resolve(import.meta.dirname, "..", "app", "package.json"),
      "utf8",
    ),
  );
  conf.name = executableName;
  conf.executableName = packageName;
  conf.productName = executableName;
  conf.flavour = flavour;
  conf.appAge = Date.now();
  fs.writeFileSync(
    path.resolve(import.meta.dirname, "..", "app", "package.json"),
    JSON.stringify(conf),
    "utf8",
  );
  fs.copyFileSync(
    path.resolve(import.meta.dirname, "..", "app", "package.json"),
    path.resolve(import.meta.dirname, "..", "app", "dist", "package.json"),
  );
}

async function main() {
  console.log("Starting packaging");

  const myArgs = process.argv.slice(2);

  const os = myArgs[0];
  const flavour = myArgs[1];

  preparePackage(os, flavour);

  // Load package.json
  const pack = path.resolve(import.meta.dirname, "..", "app", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pack));

  if (os === `windows`) {
    console.log(
      'Windows build can sometimes hang for unknown reasons. If builds take longer than 15 minutes on a computer about as fast as a 16" MBP you should probably restart the build.',
    );
  }
  try {
    await buildPackage(pkg, os, flavour);
  } catch (error) {
    console.log(`Could not create package because of an error: ${error}`);
    process.exit(1);
  }
}

main();
