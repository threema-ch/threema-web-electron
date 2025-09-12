import {createRequire} from "node:module";
import {getPackage, getTitlecaseChannelName, hasChannelName} from "./common.js";

const require = createRequire(import.meta.url);
const {createDMG} = require("electron-installer-dmg");

async function main() {
  const myArgs = process.argv.slice(2);
  const pkg = getPackage();
  const configs = pkg.electron.buildConfigs;
  const flavour = myArgs[0];

  let appDirName = configs["macOS"][flavour]["name"];

  if (hasChannelName()) {
    appDirName += ` ${getTitlecaseChannelName()}`;
  }

  console.log(`Creating package for ${appDirName} (this may take a while)`);

  const appPath = `app/build/dist-electron/packaged/${appDirName}-darwin-universal/${appDirName}.app`;

  const options = {
    appPath,
    out: "app/build/dist-electron/installers/",
    name: `${appDirName}`.substring(0, 26),
    title: `${appDirName}`.substring(0, 26),
    icon: configs["macOS"][myArgs[0]]["iconPath"],
    overwrite: true,
    background: `app/assets/installers/${flavour}.png`,
    contents(opts) {
      return [
        {x: 458, y: 211, type: "link", path: "/Applications"},
        {x: 218, y: 211, type: "file", path: opts.appPath},
      ];
    },
  };

  await createDMG(options, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
}

main();
