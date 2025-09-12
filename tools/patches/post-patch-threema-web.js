import fs from "node:fs";
import path from "node:path";
import {
  getPackage,
  getTitlecaseChannelName,
  hasChannelName,
} from "./../packaging/common.js";

const myArgs = process.argv.slice(2);
const os = myArgs[0];
const flavour = myArgs[1];

const pack = getPackage();

let prodName = pack.electron.buildConfigs[os][flavour]["name"];
if (hasChannelName()) {
  prodName += ` ${getTitlecaseChannelName()}`;
}

console.log(`Replacing Threema Web with ${prodName}`);

const rootPath = process.cwd();
const dirPath = path.join(
  rootPath,
  `app/dependencies/threema-web/release/${pack.threemaWebVersion}`,
);
const filePattern = /\.bundle\.js$/u;

fs.readdirSync(dirPath).forEach((file) => {
  if (filePattern.test(file)) {
    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, "utf-8");
    // Only replace the first match, as the pattern should occur only once.
    const regex = /"DEFAULT_TITLE","Threema Web"/u;
    const newContent = content.replace(regex, `"DEFAULT_TITLE","${prodName}"`);

    fs.writeFileSync(filePath, newContent, "utf-8");

    console.log(`Successfully processed file at path ${filePath}`);
  }
});
