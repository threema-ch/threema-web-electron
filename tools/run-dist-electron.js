const fs = require("fs");
const {resolve} = require("path");
const packager = require("electron-packager");
const {populateIgnoredPaths} = require("electron-packager/src/copy-filter");
const debug = require("debug")("dist-electron");
const {notarize} = require("electron-notarize");
const path = require("path");
const {SemVer} = require("semver");
const common = require("./packaging/common");
const makeUniversalApp = require("@electron/universal");

const DEV_ENV = process.env.DEV_ENV;

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

async function package(config, os, flavour) {
  const options = {};
  populateIgnoredPaths(options);

  // Load package.json
  const pkg = JSON.parse(
    fs.readFileSync(resolve(__dirname, "..", "app", "package.json")),
  );

  const osConfig = pkg.electron.buildConfigs[os][flavour];

  // Build allow-list
  const allowances = Object.entries(pkg.electron.dist.include || {}).map(
    ([directory, pattern]) => allow(directory, new RegExp(pattern, "u")),
  );
  debug("#Rules:", allowances.length);

  packageName = osConfig["name"];
  let executableName = osConfig["executableName"];

  const version = new SemVer(config["version"]);

  const prereleaseChannel = version.prerelease;
  if (typeof prereleaseChannel[0] === "string" && prereleaseChannel[0] !== "") {
    packageName += ` ${common.getTitlecaseChannelName()}`;
    executableName += `-${common.getChannelName()}`;
  }

  // Package
  // This will return true if the directory already exists.
  const outputPaths = await packager({
    name: packageName,
    // The exectable name does not apply to macOS. For macOS the name is used.
    executableName,
    appBundleId: executableName,
    dir: resolve(__dirname, "..", "app"),
    out: resolve(__dirname, "..", "app", "build", "dist-electron", "packaged"),
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
        debug(" !", path_);
        return true;
      }

      // Deny: dotfiles
      if (path_.match(/\/\..+$/u)) {
        debug(" !", path_);
        return true;
      }

      // Go through rules list
      for (const command of allowances) {
        switch (command(path_)) {
          case "allow":
            // Allowed: Continue walking recursively
            debug(" +", path_);
            return false;
          case "deny":
            // Denied: Stop walking recursively
            debug(" -", path_);
            return true;
          case "continue":
            // No decision: Continue traversing ruleset
            debug(" ?", path);
            break;
          default:
            throw new Error("Unknown reply");
        }
      }

      // Default: Block
      debug("  ", path_);
      return true;
    },
  });

  if (osConfig["platform"] === "darwin") {
    const universalOutputPath = `${resolve(
      __dirname,
      "..",
      "app",
      "build",
      "dist-electron",
      "packaged",
      `${packageName}-darwin-universal`,
    )}`;

    await makeUniversalApp.makeUniversalApp({
      x64AppPath: `${outputPaths[0]}/${packageName}.app`,
      arm64AppPath: `${outputPaths[1]}/${packageName}.app`,
      outAppPath: `${universalOutputPath}/${packageName}.app`,
      force: true,
    });

    outputPaths.push(universalOutputPath);

    if (!(DEV_ENV === "development")) {
      for (const outputPath of outputPaths) {
        await macOSSign(outputPath, osConfig);

        await macOSNotarize(executableName, outputPath, osConfig);
      }
    }
  }

  console.info(`Packaged: ${outputPaths}`);
}

async function macOSNotarize(executableName, outputPath, osConfig) {
  console.log(`Start notarizing at ${new Date().toLocaleTimeString()}`);
  console.log(
    "Notarization can take a long time. Expect anything between 2 and 35 minutes. ",
  );
  await notarize({
    appBundleId: executableName,
    appPath: path.join(`${outputPath}`, `${packageName}.app`),
    appleId: process.env.NOTARIZE_APPLE_ID,
    appleIdPassword: process.env.NOTARIZE_APPLE_ID_PASSWORD,
  });

  console.log(`Finished notarizing at ${new Date().toLocaleTimeString()}`);
}

async function macOSSign(outputPath, osConfig) {
  console.log("Start signing");
  const signAsync = require("electron-osx-sign").signAsync;

  await signAsync({
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
  const pack = resolve(__dirname, "..", "app", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pack));
  const osConfig = pkg.electron.buildConfigs[os][flavour];

  packageName = osConfig["name"];
  let executableName = osConfig["executableName"];

  if (common.hasChannelName()) {
    packageName += ` ${common.getTitlecaseChannelName()}`;
    executableName += `-${common.getChannelName()}`;
  }

  // TODO(jof): Please audit this. I rewrote the regex replacement with proper JSON parsing/writing. (The name mapping is a tad awkward.)
  const conf = JSON.parse(
    fs.readFileSync(resolve(__dirname, "..", "app", "package.json"), "utf8"),
  );
  conf.name = executableName;
  conf.executableName = packageName;
  conf.productName = executableName;
  conf.flavour = flavour;
  conf.appAge = Date.now();
  fs.writeFileSync(
    resolve(__dirname, "..", "app", "package.json"),
    JSON.stringify(conf),
    "utf8",
  );
  fs.copyFileSync(
    resolve(__dirname, "..", "app", "package.json"),
    resolve(__dirname, "..", "app", "dist", "package.json"),
  );
}

async function main() {
  console.log("Starting packaging");

  const myArgs = process.argv.slice(2);

  const os = myArgs[0];
  const flavour = myArgs[1];

  preparePackage(os, flavour);

  // Load package.json
  const pack = resolve(__dirname, "..", "app", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pack));

  if (os === `windows`) {
    console.log(
      'Windows build can sometimes hang for unknown reasons. If builds take longer than 15 minutes on a computer about as fast as a 16" MBP you should probably restart the build.',
    );
  }
  try {
    await package(pkg, os, flavour);
    return 0;
  } catch (error) {
    console.log(`Could not create package because of an error: ${error}`);
    return 1;
  }
}

if (require.main === module) {
  main();
}
