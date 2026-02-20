"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { isWeb } from '@/lib/is-web';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'pending';

interface SyncContextType {
    status: SyncStatus;
    isBlocking: boolean;
    lastSyncTime: Date | null;
    triggerSync: (options?: { blocking?: boolean }) => Promise<void>;
    markDirty: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [isBlocking, setIsBlocking] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const triggerPull = useCallback(async () => {
        if (!user || isWeb || status === 'syncing') return;
        setStatus('syncing');
        try {
            const response = await fetch('/api/db/sync-pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            if (!response.ok) throw new Error('Pull failed');
            const data = await response.json();
            setLastSyncTime(new Date());
            setStatus('idle');
            return data.totalPulled;
        } catch (error) {
            console.error('[Sync] Pull failed:', error);
            setStatus('error');
            return 0;
        }
    }, [user, status]);

    const triggerSync = useCallback(async (options?: { blocking?: boolean }) => {
        if (!user || isWeb || status === 'syncing') return;

        setStatus('syncing');
        if (options?.blocking) setIsBlocking(true);
        try {
            const response = await fetch('/api/db/sync-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) throw new Error('Sync failed');

            setLastSyncTime(new Date());
            setStatus('idle');
            setIsBlocking(false);
        } catch (error) {
            console.error('[Sync] Background sync failed:', error);
            setStatus('error');
            setIsBlocking(false);
        }
    }, [user, status]);

    const markDirty = useCallback(() => {
        if (isWeb) return;

        setStatus('pending');

        // Debounce background sync (wait 5s after last change)
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
            triggerSync();
        }, 5000);
    }, [triggerSync]);

    // Handle Electron close request
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electron) {
            const unsubscribe = (window as any).electron.onAppCloseRequested(async () => {
                if (status === 'pending' || status === 'error') {
                    // Force sync before closing if dirty
                    await triggerSync({ blocking: true });
                }
                (window as any).electron.appCloseConfirmed();
            });
            return () => unsubscribe();
        }
    }, [status, triggerSync]);

    // Initial sync on boot
    useEffect(() => {
        const runInitialSync = async () => {
            if (!isWeb && user) {
                // 1. Safety Check: Verify if local data belongs to this user
                try {
                    const res = await fetch('/api/db/identify');
                    if (res.ok) {
                        const { userId: localUserId } = await res.json();
                        // If we have local data but it belongs to someone else, wipe it
                        if (localUserId && localUserId !== user.id) {
                            console.warn(`[Sync] User mismatch! Local: ${localUserId}, Current: ${user.id}. Wiping.`);
                            await fetch('/api/db/clear', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ localOnly: true })
                            });
                        }
                    }
                } catch (e) {
                    console.error('[Sync] Safety check failed:', e);
                }

                // 2. Try to pull first (for new installs)
                const pulledCount = await triggerPull();

                // 3. If we pulled nothing, maybe local has data and cloud is behind?
                // We trigger a push-sync anyway to ensure everything is mirrored.
                if (pulledCount === 0) {
                    await triggerSync();
                }
            }
        };

        const t = setTimeout(() => {
            runInitialSync();
        }, 2000);
        return () => clearTimeout(t);
    }, [user, triggerSync, triggerPull]);

    return (
        <SyncContext.Provider value={{ status, isBlocking, lastSyncTime, triggerSync, markDirty }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
}
