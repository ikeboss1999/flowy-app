const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Add any necessary IPC bridges here
    // App Version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Auto Updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

    // Updater Events
    onUpdateStatus: (callback) => {
        const subscription = (_event, status, data) => callback(status, data);
        ipcRenderer.on('update-status', subscription);
        return () => {
            ipcRenderer.removeListener('update-status', subscription);
        }
    },
    onAppCloseRequested: (callback) => {
        const subscription = () => callback();
        ipcRenderer.on('app-close-requested', subscription);
        return () => {
            ipcRenderer.removeListener('app-close-requested', subscription);
        }
    },
    appCloseConfirmed: () => ipcRenderer.send('app-close-confirmed'),
});
