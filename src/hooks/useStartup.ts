"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { StartupData, cacheStartupData, readCachedStartupData } from "@/lib/startup-preload";

export function useStartup() {
    const { user, currentEmployee, profile } = useAuth();
    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = activeUserId ? "/api/startup" : null;

    const initialFallback = readCachedStartupData();

    const { data, isLoading, error, mutate } = useSWR<StartupData>(key, fetcher, {
        fallbackData: initialFallback.data,
        revalidateOnFocus: false,
        onSuccess: (freshData) => {
            if (freshData) cacheStartupData(freshData);
        }
    });

    const resolvedData: StartupData = data || initialFallback.data;
    const isReady = !key || initialFallback.hasCache || (!isLoading && !error && !!data);

    // Overwrite name from profile if available in AuthContext for immediate match
    const displayData = profile?.name && resolvedData.account.name === "Benutzer"
        ? { ...resolvedData, account: { ...resolvedData.account, name: profile.name } }
        : resolvedData;

    return {
        data: displayData,
        isReady,
        isLoading,
        error,
        mutate,
    };
}
