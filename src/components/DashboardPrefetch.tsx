"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";

function scheduleIdleTask(callback: () => void, timeout = 1200) {
    if (typeof window === "undefined") return;

    const idleCallback = (window as any).requestIdleCallback as
        | ((cb: () => void, options?: { timeout: number }) => number)
        | undefined;

    if (idleCallback) {
        idleCallback(callback, { timeout });
        return;
    }

    window.setTimeout(callback, Math.min(timeout, 800));
}

export function DashboardPrefetch() {
    const { user, currentEmployee } = useAuth();
    const { cache, mutate } = useSWRConfig();
    const activeUserId = user?.id || currentEmployee?.userId;

    useEffect(() => {
        if (!activeUserId) return;

        const cacheHasData = (key: string) => {
            const cached = cache.get(key) as { data?: unknown } | undefined;
            return cached?.data !== undefined;
        };

        const prefetch = (key: string) => {
            if (cacheHasData(key)) return;
            mutate(key, fetcher(key), { populateCache: true, revalidate: false }).catch((error) => {
                console.warn("[DashboardPrefetch]", key, error);
            });
        };

        const coreKeys = [
            `/api/settings?userId=${activeUserId}`,
            `/api/customers?userId=${activeUserId}`,
            `/api/employees?userId=${activeUserId}`,
            `/api/projects?userId=${activeUserId}`,
        ];

        const timeKeys = [
            `/api/time-entries?userId=${activeUserId}`,
            `/api/timesheets?userId=${activeUserId}`,
        ];

        const secondaryKeys = user ? [
            `/api/invoices?userId=${user.id}`,
            `/api/offers?userId=${user.id}`,
            `/api/orders?userId=${user.id}`,
            `/api/services?userId=${user.id}`,
            `/api/vehicles?userId=${user.id}`,
        ] : [];

        scheduleIdleTask(() => coreKeys.forEach(prefetch), 700);
        scheduleIdleTask(() => timeKeys.forEach(prefetch), 1600);
        scheduleIdleTask(() => secondaryKeys.forEach(prefetch), 2600);
    }, [activeUserId, user?.id, currentEmployee?.userId, cache, mutate]);

    return null;
}
