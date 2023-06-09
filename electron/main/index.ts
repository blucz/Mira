import { app, BrowserWindow, Menu, shell, ipcMain, protocol, globalShortcut, shell } from 'electron'
import { release } from 'node:os'
import { join } from 'node:path'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Mira',
    icon: join(process.env.PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(async () => {
  await createWindow();
  protocol.registerFileProtocol('atom', (request, callback) => {
    const filePath = fileURLToPath('file://' + request.url.slice('atom://'.length))
    callback(filePath)
  });

  // Create the menu template
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N',
          click: createWindow,
        },
        {
          label: 'Close',
          accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Ctrl+W',
          role: 'close',
        },
        // Add other menu items as needed
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Register the "command+f" keyboard shortcut to toggle fullscreen mode
  globalShortcut.register('CommandOrControl+F', () => {
    win.setFullScreen(!win.isFullScreen());
  });
});

function openFile(filePath: string) {
  // Open file using the system's default viewer
  shell.openPath(filePath)
    .then(() => {
      console.log('File opened successfully');
    })
    .catch((error) => {
      console.error('Error opening file:', error);
    });
}

app.on('window-all-closed', () => {
  globalShortcut.unregister('CommandOrControl+F');
});

app.on('window-all-closed', () => {
  globalShortcut.unregister('CommandOrControl+F');
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

ipcMain.handle('open-file', (_,arg: { path: string } ) => {
  const path = arg.path;
  openFile(path);
});

ipcMain.handle('delete-image', (_,arg: { path: string } ) => {
    const path = arg.path;
    try {
        fs.unlinkSync(path);
    } catch (err) {
      console.error(err);
    }
});

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
