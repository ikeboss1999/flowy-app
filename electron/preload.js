const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Add any necessary IPC bridges here
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
