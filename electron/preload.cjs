const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  openFile: () => ipcRenderer.invoke("dialog:open"),
  saveFile: (filePath, contents, defaultName) =>
    ipcRenderer.invoke("dialog:save", { filePath, contents, defaultName }),
  savePdf: (data, defaultName) =>
    ipcRenderer.invoke("dialog:savePdf", { data, defaultName }),
  getDataFolder: () => ipcRenderer.invoke("data:folder"),
  autosave: (contents) => ipcRenderer.invoke("data:autosave", contents),
  loadAutosave: () => ipcRenderer.invoke("data:loadAutosave"),
  clearAutosave: () => ipcRenderer.invoke("data:clearAutosave"),
});
