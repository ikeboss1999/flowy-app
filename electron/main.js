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

// IPC handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});
