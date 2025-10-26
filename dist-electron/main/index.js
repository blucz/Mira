"use strict";
const electron = require("electron");
const node_os = require("node:os");
const node_path = require("node:path");
const path = require("path");
const fs = require("fs");
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
  electron.protocol.handle("atom", async (request) => {
    const filePath = decodeURIComponent(request.url.slice("atom://".length));
    try {
      const stats = await fs.promises.stat(filePath);
      const fileSize = stats.size;
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
        ".ogg": "video/ogg",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp"
      };
      const mimeType = mimeTypes[ext] || "application/octet-stream";
      const rangeHeader = request.headers.get("Range");
      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const buffer = Buffer.alloc(chunkSize);
        const fd = await fs.promises.open(filePath, "r");
        await fd.read(buffer, 0, chunkSize, start);
        await fd.close();
        return new Response(buffer, {
          status: 206,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": chunkSize.toString(),
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes"
          }
        });
      } else {
        const data = await fs.promises.readFile(filePath);
        return new Response(data, {
          headers: {
            "Content-Type": mimeType,
            "Content-Length": fileSize.toString(),
            "Accept-Ranges": "bytes"
          }
        });
      }
    } catch (error) {
      console.error("Error loading file:", error);
      return new Response("File not found", { status: 404 });
    }
  });
  await createWindow();
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
electron.ipcMain.handle("set-represented-file", (_, arg) => {
  if (win && process.platform === "darwin") {
    win.setRepresentedFilename(arg.path);
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
