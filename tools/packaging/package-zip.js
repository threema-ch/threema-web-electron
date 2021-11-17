const execFileSync = require("child_process").execFileSync;
const fs = require("fs");
const common = require("./common");

function main() {
  const myArgs = process.argv.slice(2);
  const pkg = common.getPackage();
  const configs = pkg.electron.buildConfigs;

  let appDirName = configs["macOS"][myArgs[0]]["name"];
  let outDirName = configs["macOS"][myArgs[0]]["zipName"];

  if (common.hasChannelName()) {
    appDirName += ` ${common.getTitlecaseChannelName()}`;
    outDirName += `-${common.getChannelName()}.zip`;
  }

  console.log(`Creating package for ${appDirName} (this may take a while)`);

  const options = {
    dir: `app/build/dist-electron/packaged/${appDirName}-darwin-universal`,
    out: `app/build/dist-electron/installers/${outDirName}`,
    relativeOut: `../../installers/${outDirName}`,
    appName: `${appDirName}.app`,
  };

  if (fs.existsSync(options.out)) {
    fs.unlinkSync(options.out);
  }

  const args = ["-r", "--symlinks", "-9", options.relativeOut, `./`];

  const val = execFileSync("zip", args, {
    encoding: "utf-8",
    cwd: options.dir,
  });

  console.log(val);
}

main();
