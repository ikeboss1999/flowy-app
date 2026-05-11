"use client";

import React, { createContext, useContext } from 'react';

type SyncContextType = {
    status: 'idle' | 'syncing' | 'error' | 'success' | 'pending';
    isBlocking: boolean;
    markDirty: () => void;
    triggerSync: (options?: any) => Promise<void>;
    triggerPull: (options?: any) => Promise<void>;
    lastSyncTime: string | null;
};

const SyncContext = createContext<SyncContextType>({
    status: 'idle',
    isBlocking: false,
    markDirty: () => {},
    triggerSync: async () => {},
    triggerPull: async () => {},
    lastSyncTime: null,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
    return (
        <SyncContext.Provider value={{
            status: 'idle',
            isBlocking: false,
            markDirty: () => {},
            triggerSync: async () => {},
            triggerPull: async () => {},
            lastSyncTime: null,
        }}>
            {children}
        </SyncContext.Provider>
    );
}

export const useSync = () => useContext(SyncContext);
