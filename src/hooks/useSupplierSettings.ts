"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";

export interface SupplierSettings {
    prefix: string;
    nextNumber: number;
    mindestLaenge: number;
}

const initialData: SupplierSettings = { prefix: "LF-", nextNumber: 1, mindestLaenge: 4 };

export function useSupplierSettings() {
    const { user, profile } = useAuth();
    const ownerId = profile?.companyOwnerId || user?.id;
    const key = ownerId ? `/api/settings?userId=${ownerId}` : null;
    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);
    const data = useMemo(() => ({ ...initialData, ...(allSettings?.supplierSettings || {}) }), [allSettings?.supplierSettings]);

    const updateData = async (patch: Partial<SupplierSettings>) => {
        if (!ownerId) return;
        const updated = { ...data, ...patch };
        mutate({ ...allSettings, supplierSettings: updated }, false);
        const response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: ownerId, type: "supplier", data: updated }),
        });
        if (!response.ok) {
            await mutate();
            throw new Error("Lieferanten-Nummernkreis konnte nicht gespeichert werden.");
        }
        await mutate();
    };

    return { data, updateData, isLoading };
}
