const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");

const FILE_FILTERS = [
  { name: "Teste UFV", extensions: ["ufv.json", "json"] },
  { name: "Todos os arquivos", extensions: ["*"] },
];

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#173628",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dialog:open", async () => {
  const result = await dialog.showOpenDialog({
    title: "Abrir teste",
    properties: ["openFile"],
    filters: FILE_FILTERS,
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const contents = await fs.readFile(filePath, "utf8");
  return { filePath, contents };
});

ipcMain.handle("dialog:save", async (_event, payload) => {
  const { filePath, contents } = payload;
  let target = filePath;
  if (!target) {
    const result = await dialog.showSaveDialog({
      title: "Salvar teste",
      defaultPath: "teste-ufv.ufv.json",
      filters: FILE_FILTERS,
    });
    if (result.canceled || !result.filePath) return null;
    target = result.filePath.endsWith(".json")
      ? result.filePath
      : `${result.filePath}.ufv.json`;
  }
  await fs.writeFile(target, contents, "utf8");
  return { filePath: target };
});

ipcMain.handle("dialog:savePdf", async (_event, payload) => {
  const { data, defaultName } = payload;
  const result = await dialog.showSaveDialog({
    title: "Salvar PDF",
    defaultPath: defaultName || "teste-ufv.pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (result.canceled || !result.filePath) return null;
  const target = result.filePath.endsWith(".pdf")
    ? result.filePath
    : `${result.filePath}.pdf`;
  const buffer = Buffer.from(data, "base64");
  await fs.writeFile(target, buffer);
  return { filePath: target };
});
