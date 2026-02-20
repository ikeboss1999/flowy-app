/**
 * Detection: Is this running in a Web environment (Vercel/Browser) 
 * or in the local Electron app (SQLite available)?
 */
export const isWeb = typeof window === 'undefined'
    ? (!!process.env.VERCEL || !!process.env.NEXT_PUBLIC_VERCEL)
    : !((window as any).electron ||
        (window as any).process?.versions?.electron ||
        window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' && !window.location.port); // Fallback for local dev
