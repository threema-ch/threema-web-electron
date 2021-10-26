const fs = require("fs");
const {resolve} = require("path");
const {SemVer} = require("semver");

module.exports = {
  getTitlecaseChannelName: function getTitlecaseChannelName() {
    const channelName = this.getChannelName();
    const name = channelName.charAt(0).toUpperCase() + channelName.slice(1);

    return name;
  },

  getChannelName: function getChannelName() {
    const pkg = this.getPackage();

    const version = new SemVer(pkg["version"]);
    const prereleaseChannel = version.prerelease;
    if (
      prereleaseChannel !== null &&
      typeof prereleaseChannel[0] === "string"
    ) {
      return prereleaseChannel[0].toLowerCase();
    } else {
      return "latest";
    }
  },

  getVersionNumber: function getVersionNumber() {
    const pkg = this.getPackage();
    const version = new SemVer(pkg["version"]);
    return version;
  },

  hasChannelName: function hasChannelName() {
    const pkg = this.getPackage();

    const version = new SemVer(pkg["version"]);
    const prereleaseChannel = version.prerelease;
    if (
      prereleaseChannel !== null &&
      typeof prereleaseChannel[0] === "string"
    ) {
      return true;
    }
    return false;
  },

  getProductName: function getProductName(os, flavour) {
    const pkg = this.getPackage();
    console.log(`OS ${os} flavour ${flavour}`);
    const prodName = pkg["electron"]["buildConfigs"][os][flavour]["name"];
    return prodName;
  },

  getPackage: function getPackage() {
    return JSON.parse(
      fs.readFileSync(resolve(__dirname, "..", "..", "app", "package.json")),
    );
  },
};
