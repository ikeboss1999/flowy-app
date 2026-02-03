import path from 'path';
import os from 'os';

export function getAppDataPath(): string {
    // 1. Explicit override via environment variable
    if (process.env.FLOWY_DATA_PATH) {
        return process.env.FLOWY_DATA_PATH;
    }

    // 2. Redundant Mode Detection
    let isDevMode = false;
    try {
        const electron = require('electron');
        const app = electron.app || (electron.remote && electron.remote.app);

        if (app) {
            // THE GOLDEN RULE: app.isPackaged and process.defaultApp
            isDevMode = !app.isPackaged && ((process as any).defaultApp || /node_modules[\\/]electron[\\/]dist[\\/]electron\.exe$/i.test(process.execPath));
        } else {
            // Fallback for Next.js build time or generic Node
            isDevMode = process.env.NODE_ENV === 'development';
        }
    } catch (e) {
        // Fallback if electron can't be required
        isDevMode = process.env.NODE_ENV === 'development';
    }

    // FINAL GUARD: Use dev mode logic only if strictly detected
    if (isDevMode) {
        const localDataPath = path.join(process.cwd(), 'data');

        // Ensure local data directory exists
        try {
            const fs = require('fs');
            if (!fs.existsSync(localDataPath)) {
                fs.mkdirSync(localDataPath, { recursive: true });
            }
        } catch (e) {
            console.error("Failed to create local data dir:", e);
        }

        return localDataPath;
    }

    // 3. PRODUCTION MODE: Use Documents folder
    const documentsDir = path.join(os.homedir(), 'Documents');
    const finalPath = path.join(documentsDir, 'FlowY_Data');

    try {
        const fs = require('fs');
        if (!fs.existsSync(finalPath)) {
            fs.mkdirSync(finalPath, { recursive: true });
        }
    } catch (e) {
        console.error("Failed to create Data dir in Documents:", e);
    }

    return finalPath;
}
