"use client";
import useSWR from "swr";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";

export interface SubcontractorSettings { prefix: string; nextNumber: number; mindestLaenge: number; descriptionPrefix: string; descriptionNextNumber: number; descriptionPadding: number; }
const initialData: SubcontractorSettings = { prefix: "SUB-", nextNumber: 1, mindestLaenge: 4, descriptionPrefix: "LB-", descriptionNextNumber: 1, descriptionPadding: 4 };
export function useSubcontractorSettings() {
    const { user, profile } = useAuth();
    const ownerId = profile?.companyOwnerId || user?.id;
    const key = ownerId ? `/api/settings?userId=${ownerId}` : null;
    const { data: allSettings, isLoading, mutate } = useSWR(key, fetcher);
    const data = useMemo(
        () => ({ ...initialData, ...(allSettings?.subcontractorSettings || {}) }),
        [allSettings?.subcontractorSettings],
    );
    const updateData = async (patch: Partial<SubcontractorSettings>) => {
        if (!ownerId) return;
        const updated = { ...data, ...patch };
        mutate({ ...allSettings, subcontractorSettings: updated }, false);
        const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: ownerId, type: "subcontractor", data: updated }) });
        if (!response.ok) {
            console.error('[SubcontractorSettings] save failed', await response.text().catch(() => ''));
            await mutate();
            throw new Error('Subunternehmer-Nummernkreis konnte nicht gespeichert werden.');
        }
        await mutate();
    };
    return { data, updateData, isLoading };
}
