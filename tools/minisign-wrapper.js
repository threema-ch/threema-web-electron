import {execSync} from "node:child_process";
import fs from "node:fs";
import tmp from "tmp-promise";

export function signString(inputString) {
  tmp.setGracefulCleanup();

  const secretKeyFile = tmp.fileSync({mode: "0700"});
  fs.writeFileSync(secretKeyFile.name, process.env.SECRET_KEY);

  const signableFile = tmp.fileSync({mode: "0700"});
  fs.writeFileSync(signableFile.name, inputString);

  execSync(
    `echo "$SECRET_KEY_PASSWORD" | minisign -S -m ${signableFile.name} -s ${secretKeyFile.name}`,
  );

  secretKeyFile.removeCallback();
  signableFile.removeCallback();

  return fs.readFileSync(`${signableFile.name}.minisig`);
}

export function signBuffer(atPath) {
  tmp.setGracefulCleanup();

  const secretKeyFile = tmp.fileSync({mode: "0700"});
  fs.writeFileSync(secretKeyFile.name, process.env.SECRET_KEY);

  execSync(
    `echo "$SECRET_KEY_PASSWORD" | minisign -S -m ${atPath} -s ${secretKeyFile.name}`,
  );

  secretKeyFile.removeCallback();

  return fs.readFileSync(`${atPath}.minisig`);
}
