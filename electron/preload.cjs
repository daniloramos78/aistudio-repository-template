const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  openFile: () => ipcRenderer.invoke("dialog:open"),
  saveFile: (filePath, contents) =>
    ipcRenderer.invoke("dialog:save", { filePath, contents }),
  savePdf: (data, defaultName) =>
    ipcRenderer.invoke("dialog:savePdf", { data, defaultName }),
});
