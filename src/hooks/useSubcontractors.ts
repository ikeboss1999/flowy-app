"use client";

import useSWR from "swr";
import { Subcontractor } from "@/types/subcontractor";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";

export function useSubcontractors() {
    const { user, currentEmployee, profile } = useAuth();
    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = activeUserId ? `/api/subcontractors?userId=${activeUserId}` : null;
    const { data = [], isLoading, mutate } = useSWR<Subcontractor[]>(key, fetcher, { revalidateOnFocus: false });

    const save = async (item: Subcontractor) => {
        const response = await fetch("/api/subcontractors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || "Subunternehmer konnte nicht gespeichert werden.");
        }
        await mutate();
    };

    const remove = async (id: string) => {
        const response = await fetch(`/api/subcontractors?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Subunternehmer konnte nicht gelöscht werden.");
        await mutate();
    };

    return { subcontractors: data, saveSubcontractor: save, deleteSubcontractor: remove, isLoading };
}
