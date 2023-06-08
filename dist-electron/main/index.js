"use strict";
const electron = require("electron");
const node_os = require("node:os");
const node_path = require("node:path");
const fs = require("fs");
const url$1 = require("url");
process.env.DIST_ELECTRON = node_path.join(__dirname, "..");
process.env.DIST = node_path.join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? node_path.join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
if (node_os.release().startsWith("6.1"))
  electron.app.disableHardwareAcceleration();
if (process.platform === "win32")
  electron.app.setAppUserModelId(electron.app.getName());
if (!electron.app.requestSingleInstanceLock()) {
  electron.app.quit();
  process.exit(0);
}
let win = null;
const preload = node_path.join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = node_path.join(process.env.DIST, "index.html");
async function createWindow() {
  win = new electron.BrowserWindow({
    title: "Mira",
    icon: node_path.join(process.env.PUBLIC, "favicon.ico"),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.setWindowOpenHandler(({ url: url2 }) => {
    if (url2.startsWith("https:"))
      electron.shell.openExternal(url2);
    return { action: "deny" };
  });
}
electron.app.whenReady().then(async () => {
  await createWindow();
  electron.protocol.registerFileProtocol("atom", (request, callback) => {
    const filePath = url$1.fileURLToPath("file://" + request.url.slice("atom://".length));
    callback(filePath);
  });
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        {
          label: "New",
          accelerator: process.platform === "darwin" ? "Cmd+N" : "Ctrl+N",
          click: createWindow
        },
        {
          label: "Close",
          accelerator: process.platform === "darwin" ? "Cmd+W" : "Ctrl+W",
          role: "close"
        }
        // Add other menu items as needed
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(menuTemplate);
  electron.Menu.setApplicationMenu(menu);
  electron.globalShortcut.register("CommandOrControl+F", () => {
    win.setFullScreen(!win.isFullScreen());
  });
});
function openFile(filePath) {
  electron.shell.openPath(filePath).then(() => {
    console.log("File opened successfully");
  }).catch((error) => {
    console.error("Error opening file:", error);
  });
}
electron.app.on("window-all-closed", () => {
  electron.globalShortcut.unregister("CommandOrControl+F");
});
electron.app.on("window-all-closed", () => {
  electron.globalShortcut.unregister("CommandOrControl+F");
  win = null;
  if (process.platform !== "darwin")
    electron.app.quit();
});
electron.app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized())
      win.restore();
    win.focus();
  }
});
electron.app.on("activate", () => {
  const allWindows = electron.BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
electron.ipcMain.handle("open-file", (_, arg) => {
  const path2 = arg.path;
  openFile(path2);
});
electron.ipcMain.handle("delete-image", (_, arg) => {
  const path2 = arg.path;
  try {
    fs.unlinkSync(path2);
  } catch (err) {
    console.error(err);
  }
});
electron.ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new electron.BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
//# sourceMappingURL=index.js.map
