const common = require("./../packaging/common");
const execSync = require("child_process").execSync;

const pack = common.getPackage();
const threemaWebVersion = `2.4.2`;
const versionString = `${threemaWebVersion} (${pack.version})`;

console.log(`Patch Threema Web version number to ${versionString}`);
const cmd = `sed -i.bak -E "s/echo \\"\\+ Update version number...\\"/echo \\"\\+ Update version number...\\"\\nVERSION=\\"${versionString}\\"/g" app/dependencies/threema-web/dist/package.sh`;
console.log(cmd);
const val = execSync(cmd, {encoding: "utf-8"});
console.log(val);
