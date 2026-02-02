const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.autoDownload = true;
autoUpdater.allowPrerelease = false;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            partition: 'persist:flowy',
        },
        icon: path.join(__dirname, '../Logo.png'),
        title: "FlowY Construction Management"
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, we need a way to serve the Next.js app
        // For now, we'll try to load the static output if possible, 
        // but typically Next.js in Electron requires a custom server or 'next export'
        // Since we use API routes and SQLite, a formal build is needed.
        // We will assume the user starts the next server or we bundle it.
        mainWindow.loadURL('http://localhost:3000');
    }

    mainWindow.setMenuBarVisibility(false);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
    }
});

// Update events
autoUpdater.on('update-available', () => {
    console.log('Update available.');
});

autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded; will install on quit');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
