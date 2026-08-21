import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  isElectron: true,
  platform: process.platform,
  // Window Controls
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onWindowStateChange: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("window:state-change", handler);
    return () => ipcRenderer.removeListener("window:state-change", handler);
  },
  // Native File Dialogs & Filesystem
  saveVaultFile: (payload) => ipcRenderer.invoke("dialog:saveVaultFile", payload),
  openVaultFile: (payload) => ipcRenderer.invoke("dialog:openVaultFile", payload),
  // Notifications
  notify: (title, body) => ipcRenderer.invoke("app:notify", { title, body }),
  // External Links
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  // System & Platform Info
  getPlatformInfo: () => ipcRenderer.invoke("app:getPlatformInfo")
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  }
});
