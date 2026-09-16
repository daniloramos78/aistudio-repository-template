const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs/promises");

const FILE_FILTERS = [
  { name: "Teste UFV", extensions: ["ufv.json", "json"] },
  { name: "Todos os arquivos", extensions: ["*"] },
];

const DATA_FOLDER_NAME = "Planilha de Testes UFV";
const AUTOSAVE_FILE = "rascunho-automatico.ufv.json";

function dataFolder() {
  return path.join(app.getPath("documents"), DATA_FOLDER_NAME);
}

async function ensureDataFolder() {
  const folder = dataFolder();
  await fs.mkdir(folder, { recursive: true });
  return folder;
}

function autosavePath() {
  return path.join(dataFolder(), AUTOSAVE_FILE);
}

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
      spellcheck: false,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  let closing = false;
  win.on("close", (event) => {
    if (closing) return;
    event.preventDefault();
    closing = true;
    win.webContents
      .executeJavaScript("window.flushAutosave ? window.flushAutosave() : null")
      .catch(() => null)
      .finally(() => {
        if (!win.isDestroyed()) win.destroy();
      });
  });
}

app.whenReady().then(async () => {
  await ensureDataFolder();
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("data:folder", async () => ensureDataFolder());

ipcMain.handle("data:autosave", async (_event, contents) => {
  const folder = await ensureDataFolder();
  const target = path.join(folder, AUTOSAVE_FILE);
  await fs.writeFile(target, String(contents ?? ""), "utf8");
  return { filePath: target };
});

ipcMain.handle("data:loadAutosave", async () => {
  const target = autosavePath();
  try {
    const contents = await fs.readFile(target, "utf8");
    if (!contents.trim()) return null;
    return { filePath: target, contents };
  } catch {
    return null;
  }
});

ipcMain.handle("data:clearAutosave", async () => {
  try {
    await fs.unlink(autosavePath());
  } catch {
    /* ignore */
  }
});

ipcMain.handle("dialog:open", async () => {
  const folder = await ensureDataFolder();
  const result = await dialog.showOpenDialog({
    title: "Abrir teste",
    defaultPath: folder,
    properties: ["openFile"],
    filters: FILE_FILTERS,
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const contents = await fs.readFile(filePath, "utf8");
  return { filePath, contents };
});

ipcMain.handle("dialog:save", async (_event, payload) => {
  const { filePath, contents, defaultName } = payload;
  let target = filePath;
  if (!target) {
    const folder = await ensureDataFolder();
    const result = await dialog.showSaveDialog({
      title: "Salvar teste",
      defaultPath: path.join(folder, defaultName || "teste-ufv.ufv.json"),
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
  const folder = await ensureDataFolder();
  const result = await dialog.showSaveDialog({
    title: "Salvar PDF",
    defaultPath: path.join(folder, defaultName || "teste-ufv.pdf"),
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
