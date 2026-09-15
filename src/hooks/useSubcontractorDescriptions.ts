"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { SubcontractorDescription } from "@/types/subcontractor-description";

export function useSubcontractorDescriptions() {
    const { user, profile } = useAuth();
    const ownerId = profile?.companyOwnerId || user?.id;
    const key = ownerId ? `/api/subcontractor-descriptions?userId=${ownerId}` : null;
    const { data = [], isLoading, mutate } = useSWR<SubcontractorDescription[]>(key, fetcher, { revalidateOnFocus: false });
    const save = async (description: SubcontractorDescription) => {
        const response = await fetch("/api/subcontractor-descriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(description) });
        if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || "Leistungsbeschreibung konnte nicht gespeichert werden."); }
        const result = await response.json();
        await mutate();
        return { ...description, ...result } as SubcontractorDescription;
    };
    return { descriptions: data, saveDescription: save, isLoading };
}
