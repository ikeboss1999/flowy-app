"use client";

import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";
import { Supplier } from "@/types/supplier";
import { INCOMING_FEATURE_ENABLED } from "@/lib/incoming-feature";

export function useSuppliers() {
    const { user, currentEmployee, profile } = useAuth();
    const ownerId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = ownerId && INCOMING_FEATURE_ENABLED ? "/api/suppliers" : null;
    const { data = [], isLoading, mutate } = useSWR<Supplier[]>(key, fetcher, { revalidateOnFocus: false });

    const saveSupplier = async (supplier: Supplier) => {
        const response = await fetch("/api/suppliers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(supplier),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Lieferant konnte nicht gespeichert werden.");
        await mutate();
    };

    const deleteSupplier = async (id: string) => {
        const response = await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Lieferant konnte nicht gelöscht werden.");
        await mutate();
    };

    return { suppliers: data, saveSupplier, deleteSupplier, isLoading, mutate };
}
