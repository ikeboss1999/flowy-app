"use client";

import { useState, useEffect, useRef } from "react";

interface AutoSaveConfig<T> {
    id: string;
    endpoint: string;
    data: T;
    isDirty: boolean;
    debounceMs?: number;
    enabled?: boolean;
    onSaveSuccess?: (savedData: any) => void;
    onSaveError?: (error: any) => void;
}

export function useAutoSave<T>({
    id,
    endpoint,
    data,
    isDirty,
    debounceMs = 1500,
    enabled = true,
    onSaveSuccess,
    onSaveError
}: AutoSaveConfig<T>) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const lastSavedDataRef = useRef<string>("");

    useEffect(() => {
        if (!enabled || !isDirty) return;

        // Serialize current data to verify actual changes
        const currentDataStr = JSON.stringify({ id, ...data });
        if (currentDataStr === lastSavedDataRef.current) return;

        const timer = setTimeout(async () => {
            setIsSaving(true);
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: currentDataStr
                });

                if (!response.ok) {
                    throw new Error(`Auto-save failed: ${response.statusText}`);
                }

                const result = await response.json();
                lastSavedDataRef.current = currentDataStr;
                
                const now = new Date();
                const timeStr = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                setLastSaved(timeStr);
                
                if (onSaveSuccess) {
                    onSaveSuccess(result);
                }
            } catch (error) {
                console.error("AutoSave Error:", error);
                if (onSaveError) {
                    onSaveError(error);
                }
            } finally {
                setIsSaving(false);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [data, id, endpoint, isDirty, enabled, debounceMs, onSaveSuccess, onSaveError]);

    return { isSaving, lastSaved };
}
