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
    const { user, currentEmployee, profile } = useAuth();
    const { cache, mutate } = useSWRConfig();
    const ownerUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const actorUserId = user?.id || currentEmployee?.userId;

    useEffect(() => {
        if (!ownerUserId) return;

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

        const canUse = (permission: string) => {
            if (!profile) return !!user;
            if (profile.role === "admin" || profile.role === "developer") return true;
            if (profile.permissions?.["*"] === true) return true;
            return !!profile.permissions?.[permission];
        };

        const coreKeys = [
            `/api/settings?userId=${ownerUserId}`,
            actorUserId ? `/api/todos?userId=${actorUserId}` : null,
            canUse("customers_read") ? `/api/customers?userId=${ownerUserId}` : null,
            canUse("projects_read") ? `/api/projects?userId=${ownerUserId}` : null,
            canUse("employees_read") ? `/api/employees?userId=${ownerUserId}` : null,
        ].filter(Boolean) as string[];

        const timeKeys = canUse("time_tracking_use")
            ? [
                `/api/time-entries?userId=${ownerUserId}`,
                `/api/timesheets?userId=${ownerUserId}`,
            ]
            : [];

        const secondaryKeys = [
            canUse("invoices_read") ? `/api/invoices?userId=${ownerUserId}` : null,
            canUse("offers_read") ? `/api/offers?userId=${ownerUserId}` : null,
            canUse("orders_read") ? `/api/orders?userId=${ownerUserId}` : null,
            (canUse("invoices_write") || canUse("offers_write")) ? `/api/services?userId=${ownerUserId}` : null,
            canUse("vehicles_use") ? `/api/vehicles?userId=${ownerUserId}` : null,
            canUse("crm_read") ? "/api/crm" : null,
            canUse("calendar_use") ? `/api/calendar-events?userId=${ownerUserId}` : null,
            canUse("archive_read") ? "/api/archive-files" : null,
            canUse("archive_read") ? "/api/archive-folders" : null,
            (canUse("invoices_read") || canUse("reports_read")) ? "/api/dashboard/summary" : null,
        ].filter(Boolean) as string[];

        scheduleIdleTask(() => coreKeys.forEach(prefetch), 700);
        scheduleIdleTask(() => timeKeys.forEach(prefetch), 1600);
        scheduleIdleTask(() => secondaryKeys.forEach(prefetch), 2600);
    }, [ownerUserId, actorUserId, user, profile, cache, mutate]);

    return null;
}
