import {contextBridge, ipcRenderer} from "electron";

// The contextBridge allows us to safely expose APIs to the renderer process.
// Here we use it to expose a generic application scoped data store
// that survives window reloads.
contextBridge.exposeInMainWorld("AppDataStore", {
  setValue: (key: string, value: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    ipcRenderer.sendSync("app-data-store:set-value", {key, value}),
  getValue: (key: string) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    ipcRenderer.sendSync("app-data-store:get-value", {key}),
});
