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
        const listener = (event, status, data) => callback(status, data);
        ipcRenderer.on('update-status', listener);
        return () => ipcRenderer.removeListener('update-status', listener);
    }
});
