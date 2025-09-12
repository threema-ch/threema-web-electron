import fs from "node:fs";
import path from "node:path";
import {getPackage} from "./../packaging/common.js";

console.log(`Patching Threema Web for Threema Blue`);

const pack = getPackage();

const rootPath = process.cwd();
const filePath = path.join(
  rootPath,
  `app/dependencies/threema-web/release/${pack.threemaWebVersion}`,
  "userconfig.js",
);

const additions = `// Overrides by blue-patch-threema-web.js
window.UserConfig.SALTYRTC_HOST = 'saltyrtc-staging.threema.ch';
window.UserConfig.PUSH_URL = 'https://push-web-staging.threema.ch/push';
window.UserConfig.ARP_LOG_TRACE = true;
window.UserConfig.CONSOLE_LOG_LEVEL = 'debug';
`;

fs.appendFileSync(filePath, additions, {encoding: "utf-8"});

console.log("Successfully applied patch for Threema Blue");
