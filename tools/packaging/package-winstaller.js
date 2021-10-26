const installer = require("electron-installer-windows");
const common = require("./common");

async function main() {
  const myArgs = process.argv.slice(2);
  const pkg = common.getPackage();
  const configs = pkg.electron.buildConfigs;

  let appDirName = configs["windows"][myArgs[0]]["name"];
  let executableName = configs["linux-deb"][myArgs[0]]["executableName"];

  if (common.hasChannelName()) {
    appDirName += ` ${common.getTitlecaseChannelName()}`;
    executableName += `-${common.getChannelName()}`;
  }

  console.log(`Creating package for ${appDirName} (this may take a while)`);

  const options = {
    src: `app/build/dist-electron/packaged/${appDirName}-win32-x64/`,
    dest: "app/build/dist-electron/installers",
    icon: configs["windows"][myArgs[0]]["iconPath"],
    exe: `${executableName}.exe`,
    authors: ["Threema GmbH"],
    animation: configs["windows"][myArgs[0]]["animation"],
  };

  if (process.platform === "win32") {
    options["src"] = `build/dist-electron/packaged/${appDirName}-win32-ia32/`;
  }

  try {
    await installer(options);
    console.log(`Successfully created package at ${options.dest}`);
    console.warn(`WARNING: This installer is not signed!`);
  } catch (err) {
    console.error(err, err.stack);
    process.exit(1);
  }
}

main();
