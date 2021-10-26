const execSync = require("child_process").execSync;
const fs = require("fs");
const tmp = require("tmp-promise");

module.exports = {
  signString(inputString) {
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
  },

  signBuffer(atPath) {
    tmp.setGracefulCleanup();

    const secretKeyFile = tmp.fileSync({mode: "0700"});
    fs.writeFileSync(secretKeyFile.name, process.env.SECRET_KEY);

    execSync(
      `echo "$SECRET_KEY_PASSWORD" | minisign -S -m ${atPath} -s ${secretKeyFile.name}`,
    );

    secretKeyFile.removeCallback();

    return fs.readFileSync(`${atPath}.minisig`);
  },
};
