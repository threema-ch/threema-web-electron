const installer = require("electron-installer-redhat");
const common = require("./common");

async function main() {
  const myArgs = process.argv.slice(2);
  const pkg = common.getPackage();
  const configs = pkg.electron.buildConfigs;

  let appDirName = configs["linux-deb"][myArgs[0]]["name"];
  let executableName = configs["linux-deb"][myArgs[0]]["executableName"];

  if (common.hasChannelName()) {
    appDirName += ` ${common.getTitlecaseChannelName()}`;
    executableName += `-${common.getChannelName()}`;
  }

  console.log(`Creating package for ${appDirName} (this may take a while)`);

  const options = {
    src: `app/build/dist-electron/packaged/${appDirName}-linux-x64/`,
    dest: "app/build/dist-electron/installers",
    name: appDirName,
    bin: executableName,
    productName: appDirName,
    icon: {
      // KDE
      "48x48": configs["linux-deb"][myArgs[0]]["icons"]["48x48"],
      "64x64": configs["linux-deb"][myArgs[0]]["icons"]["64x64"],
      "128x128": configs["linux-deb"][myArgs[0]]["icons"]["128x128"],
      "256x256": configs["linux-deb"][myArgs[0]]["icons"]["256x256"],
      "scalable": configs["linux-deb"][myArgs[0]]["icons"]["scalable"],
      // Ubuntu
      "symbolic": configs["linux-deb"][myArgs[0]]["icons"]["scalable"],
    },
    arch: "x86_64",
    requires: ["libdrm"],
    homepage: "https://threema.ch",
    description: "Desktop client for Threema (requires the mobile app)",
    productDescription:
      "Threema for desktop is a wrapped version of Threema Web. A multi-device solution will become available at a later date.",
    section: "comm",
    categories: ["Network", "InstantMessaging"],
  };

  try {
    await installer(options);
    console.log(`Successfully created package at ${options.dest}`);
  } catch (err) {
    console.error(err, err.stack);
    process.exit(1);
  }
}

main();
