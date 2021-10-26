const zip = require("electron-installer-zip");

function main(options) {
  console.log("Creating package (this may take a while)");
  zip(options, (err, res) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log("Zip file written to: ", res);
  });
}

main({
  dir: "app/build/dist-electron/packaged/Threema Desktop-win32-x64/threema-web-desktop.exe",
  out: "app/build/dist-electron/installers/Threema-Desktop-win32.zip",
});
