export { };

declare global {
    interface Window {
        electron: {
            getAppVersion: () => Promise<string>;
            checkForUpdates: () => Promise<any>;
            quitAndInstall: () => Promise<void>;
            onUpdateStatus: (callback: (status: string, data: any) => void) => () => void;
        };
    }
}
