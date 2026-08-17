"use client";

import { fetcher } from "@/lib/fetcher";

export type StartupData = {
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

export const STARTUP_CACHE_KEY = "flowy_startup_cache";

export const fallbackStartupData: StartupData = {
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

export function readCachedStartupData(): { data: StartupData; hasCache: boolean } {
    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem(STARTUP_CACHE_KEY);
            if (cached) return { data: JSON.parse(cached), hasCache: true };
        } catch { }
    }
    return { data: fallbackStartupData, hasCache: false };
}

export function cacheStartupData(data: StartupData) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STARTUP_CACHE_KEY, JSON.stringify(data));
    } catch { }
}

export function preloadImage(src?: string | null) {
    if (!src || typeof window === "undefined") return Promise.resolve();

    return new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = src;

        if ("decode" in image) {
            image.decode().then(() => resolve()).catch(() => resolve());
        }
    });
}

export async function preloadStartup() {
    const data = await fetcher("/api/startup") as StartupData;
    cacheStartupData(data);
    await preloadImage(data.company.logo);
    return data;
}
