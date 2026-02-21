import fs from 'fs';
import path from 'path';
import os from 'os';

// This utility must be safe to import in environments where native modules might fail
// We use a simplified version of getAppDataPath to avoid circular dependencies or heavy imports

function getLogPath(): string {
    // Check environment variable first
    if (process.env.FLOWY_DATA_PATH) {
        return path.join(process.env.FLOWY_DATA_PATH, 'sqlite_debug.log');
    }

    // Production path (Documents/FlowY_Data)
    const documentsDir = path.join(os.homedir(), 'Documents');
    const prodPath = path.join(documentsDir, 'FlowY_Data');

    // Dev path
    const devPath = path.join(process.cwd(), 'data');

    // Simple detection: if we are in next dev or if data folder exists locally
    const isDev = process.env.NODE_ENV === 'development' || fs.existsSync(devPath);
    const finalDir = isDev ? devPath : prodPath;

    // Ensure directory exists
    try {
        if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
        }
    } catch (e) {
        // ignore
    }

    return path.join(finalDir, 'sqlite_debug.log');
}

export function writeLog(module: string, msg: string) {
    try {
        const logPath = getLogPath();
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] [${module}] ${msg}\n`);
    } catch (e) {
        // Silently fail to avoid crashing the app during logging
        console.error(`[Logger Error] Failed to write to log: ${e}`);
    }
}
