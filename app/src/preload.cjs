// CJS for now, see:
// https://www.electronjs.org/docs/latest/tutorial/esm#sandboxed-preload-scripts-cant-use-esm-imports.
const electron = require("electron");

// The contextBridge allows us to safely expose APIs to the renderer process.
// Here we use it to expose a generic application scoped data store
// that survives window reloads.
electron.contextBridge.exposeInMainWorld("AppDataStore", {
  /**
   * Set a value in the `AppDataStore`.
   * 
   * @param {string} key Unique key to identify the stored value by.
   * @param {unknown} value Value to store.
   * @returns {void}
   */
  setValue: (key, value) =>
    electron.ipcRenderer.sendSync("app-data-store:set-value", {key, value}),
  /**
   * Get a value from the `AppDataStore`.
   * 
   * @param {string} key Unique key to identify the stored value by.
   * @returns {unknown} The stored value.
   */
  getValue: (key) =>
    electron.ipcRenderer.sendSync("app-data-store:get-value", {key}),
});
