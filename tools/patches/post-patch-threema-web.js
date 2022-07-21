const common = require("./../packaging/common");
const execSync = require("child_process").execSync;

const myArgs = process.argv.slice(2);
const os = myArgs[0];
const flavour = myArgs[1];

const pack = common.getPackage();
const threemaWebVersion = `2.4.2`;
let prodName = pack.electron.buildConfigs[os][flavour]["name"];

if (common.hasChannelName()) {
  prodName += ` ${common.getTitlecaseChannelName()}`;
}

console.log(`Replacing Threema Web with ${prodName}`);
const cmd = `sed -i.bak -E "s/\\"DEFAULT_TITLE\\",\\"Threema Web\\"/\\"DEFAULT_TITLE\\",\\"${prodName}\\"/g" app/dependencies/threema-web/release/threema-web-${threemaWebVersion}/*.bundle.js`;
console.log(cmd);
const val = execSync(cmd, {encoding: "utf-8"});
console.log(val);
