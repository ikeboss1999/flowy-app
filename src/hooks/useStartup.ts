"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";

type StartupData = {
    company: {
        companyName: string;
        logo: string | null;
        zipCode: string;
        city: string;
    };
    account: {
        name: string;
    };
    status: {
        invoiceDrafts: number;
        overdueInvoices: number;
        openOffers: number;
        activeProjects: number;
        employees: number;
    };
};

const fallbackData: StartupData = {
    company: {
        companyName: "FlowY",
        logo: null,
        zipCode: "",
        city: "",
    },
    account: {
        name: "Benutzer",
    },
    status: {
        invoiceDrafts: 0,
        overdueInvoices: 0,
        openOffers: 0,
        activeProjects: 0,
        employees: 0,
    },
};

function getCachedStartupData(): StartupData {
    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem("flowy_startup_cache");
            if (cached) return JSON.parse(cached);
        } catch { }
    }
    return fallbackData;
}

export function useStartup() {
    const { user, currentEmployee, profile } = useAuth();
    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = activeUserId ? "/api/startup" : null;

    const initialFallback = getCachedStartupData();

    const { data, isLoading, error, mutate } = useSWR<StartupData>(key, fetcher, {
        fallbackData: initialFallback,
        revalidateOnFocus: false,
        onSuccess: (freshData) => {
            if (typeof window !== "undefined" && freshData) {
                try {
                    localStorage.setItem("flowy_startup_cache", JSON.stringify(freshData));
                } catch { }
            }
        }
    });

    const resolvedData = data || initialFallback;

    // Overwrite name from profile if available in AuthContext for immediate match
    if (profile?.name && resolvedData.account.name === "Benutzer") {
        resolvedData.account.name = profile.name;
    }

    return {
        data: resolvedData,
        isLoading,
        error,
        mutate,
    };
}
