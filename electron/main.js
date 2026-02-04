const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = !app.isPackaged && (process.defaultApp || /node_modules[\\/]electron[\\/]dist[\\/]electron\.exe$/i.test(process.execPath));
const { autoUpdater } = require('electron-updater');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Configure auto-updater
autoUpdater.autoDownload = true;
autoUpdater.allowPrerelease = false;

console.log('--- ENVIRONMENT CHECK ---');
console.log('isDev:', isDev);
console.log('app.isPackaged:', app.isPackaged);
console.log('process.defaultApp:', process.defaultApp);
console.log('execPath:', process.execPath);
console.log('-------------------------');

let mainWindow;

async function createWindow() {
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
        console.log('Running in Development Mode');
        mainWindow.loadURL('http://localhost:3001');
        mainWindow.webContents.openDevTools();
    } else {
        console.log('Running in Production Mode');
        // Ensure NODE_ENV is production for Next.js internal server
        process.env.NODE_ENV = 'production';

        // In production, we start the Next.js server internally
        try {
            const port = 3000;
            const appPath = app.getAppPath();
            const nextApp = next({
                dev: false,
                dir: appPath,
                conf: {
                    distDir: '.next',
                }
            });
            const handle = nextApp.getRequestHandler();

            await nextApp.prepare();

            createServer((req, res) => {
                const parsedUrl = parse(req.url, true);
                handle(req, res, parsedUrl);
            }).listen(port, (err) => {
                if (err) throw err;
                console.log(`> Ready on http://localhost:${port}`);
            });

            mainWindow.loadURL(`http://localhost:${port}`);
        } catch (err) {
            console.error('Failed to start Next.js server:', err);
        }
    }

    mainWindow.setMenuBarVisibility(false);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // Before creating window, we might want to check updates
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
    }
    await createWindow();
});

// Helper to send status to renderer
function sendStatusToWindow(status, data = null) {
    if (mainWindow) {
        mainWindow.webContents.send('update-status', status, data);
    }
}

// Update events
autoUpdater.on('checking-for-update', () => {
    console.log('[UPDATER] Checking for updates...');
    sendStatusToWindow('checking');
});

autoUpdater.on('update-available', (info) => {
    console.log('[UPDATER] Update available:', info);
    sendStatusToWindow('available', info);
});

autoUpdater.on('update-not-available', (info) => {
    console.log('[UPDATER] Update not available.', info);
    sendStatusToWindow('not-available', info);
});

autoUpdater.on('error', (err) => {
    console.error('[UPDATER] Error in auto-updater:', err);
    sendStatusToWindow('error', err.toString());
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
    sendStatusToWindow('progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('[UPDATER] Update downloaded:', info);
    sendStatusToWindow('downloaded', info);
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

// IPC handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('check-for-updates', () => {
    if (!isDev) {
        return autoUpdater.checkForUpdates();
    } else {
        // Mock for dev
        console.log('[UPDATER] Dev mode: Mocking check for updates');
        sendStatusToWindow('checking');
        setTimeout(() => sendStatusToWindow('not-available', { version: '1.0.0 (Dev)' }), 2000);
        return null;
    }
});

ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});
