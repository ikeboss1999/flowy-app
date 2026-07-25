"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSWRConfig } from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";

export function DashboardPrefetch() {
    const pathname = usePathname();
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

        const isPrivileged = profile?.role === "admin" || profile?.role === "developer";

        // Priority fetch for current active page (always, for all users)
        let activeKey: string | null = null;
        if (pathname.startsWith("/projects") && canUse("projects_read")) {
            activeKey = `/api/projects?userId=${ownerUserId}`;
        } else if (pathname.startsWith("/invoices") && canUse("invoices_read")) {
            activeKey = `/api/invoices?userId=${ownerUserId}`;
        } else if (pathname.startsWith("/offers") && canUse("offers_read")) {
            activeKey = `/api/offers?userId=${ownerUserId}`;
        } else if (pathname.startsWith("/customers") && canUse("customers_read")) {
            activeKey = `/api/customers?userId=${ownerUserId}`;
        } else if (pathname.startsWith("/employees") && canUse("employees_read")) {
            activeKey = `/api/employees?summary=1&userId=${ownerUserId}`;
        } else if (pathname.startsWith("/time-tracking") && canUse("time_tracking_use")) {
            activeKey = `/api/time-entries?userId=${ownerUserId}`;
        }

        if (activeKey) {
            prefetch(activeKey);
        }

        // Background prefetching only for privileged users (admin / developer)
        // to avoid saturating the DB with statement timeouts for regular employees
        if (!isPrivileged) {
            return;
        }

        const coreKeys = [
            actorUserId ? `/api/todos?userId=${actorUserId}` : null,
            canUse("customers_read") ? `/api/customers?userId=${ownerUserId}` : null,
            canUse("projects_read") ? `/api/projects?userId=${ownerUserId}` : null,
            canUse("employees_read") ? `/api/employees?summary=1&userId=${ownerUserId}` : null,
        ].filter(Boolean).filter((k) => k !== activeKey) as string[];

        const timeKeys = canUse("time_tracking_use")
            ? [
                `/api/time-entries?userId=${ownerUserId}`,
                `/api/timesheets?userId=${ownerUserId}`,
            ].filter((k) => k !== activeKey)
            : [];

        const secondaryKeys = [
            `/api/settings?userId=${ownerUserId}`,
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
        ].filter(Boolean).filter((k) => k !== activeKey) as string[];

        // Stagger background prefetches with 600ms gap between each call
        const keysToPrefetch = [...coreKeys, ...timeKeys, ...secondaryKeys];
        const timers: number[] = [];

        keysToPrefetch.forEach((key, index) => {
            const timer = window.setTimeout(() => {
                prefetch(key);
            }, 800 + index * 600);
            timers.push(timer);
        });

        return () => {
            timers.forEach((t) => clearTimeout(t));
        };
    }, [ownerUserId, actorUserId, user, profile, cache, mutate, pathname]);

    return null;
}
