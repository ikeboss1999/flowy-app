"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";
import { IncomingInvoice } from "@/types/incoming-invoice";

async function errorMessage(response: Response, fallback: string) {
    const payload = await response.json().catch(() => null);
    return payload?.error || payload?.message || fallback;
}

async function sha256(file: File): Promise<string | null> {
    if (!globalThis.crypto?.subtle) return null;
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function useIncomingInvoices() {
    const { user, currentEmployee, profile } = useAuth();
    const activeUserId = profile?.companyOwnerId || currentEmployee?.userId || user?.id;
    const key = activeUserId ? `/api/incoming-invoices?userId=${activeUserId}` : null;
    const { data = [], isLoading, mutate } = useSWR<IncomingInvoice[]>(key, fetcher, { revalidateOnFocus: false });

    const upload = async (file: File) => {
        if (!activeUserId) throw new Error("Sie sind nicht angemeldet.");
        const prepare = await fetch("/api/incoming-invoices/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size }),
        });
        if (!prepare.ok) throw new Error(await errorMessage(prepare, "Upload konnte nicht vorbereitet werden."));
        const { importId, path, token } = await prepare.json();

        const { error: uploadError } = await supabase.storage.from("incoming-invoices").uploadToSignedUrl(path, token, file);
        if (uploadError) throw new Error(uploadError.message || "Datei konnte nicht hochgeladen werden.");

        const fileHash = await sha256(file);
        const complete = await fetch("/api/incoming-invoices/complete-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ importId, storagePath: path, name: file.name, mimeType: file.type, size: file.size, fileHash }),
        });
        if (!complete.ok) throw new Error(await errorMessage(complete, "Datei konnte nicht gespeichert werden."));
        const invoice = await complete.json() as IncomingInvoice;
        await mutate((current = []) => [invoice, ...current], false);
        return invoice;
    };

    const getDocumentUrl = async (id: string) => {
        const response = await fetch(`/api/incoming-invoices/file-url?id=${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error(await errorMessage(response, "Dokument konnte nicht geöffnet werden."));
        const { url } = await response.json();
        return url as string;
    };

    const openDocument = async (id: string) => {
        const url = await getDocumentUrl(id);
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const updateIncomingInvoice = async (id: string, changes: Partial<IncomingInvoice>) => {
        const response = await fetch("/api/incoming-invoices", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...changes }),
        });
        if (!response.ok) throw new Error(await errorMessage(response, "Eingangsrechnung konnte nicht gespeichert werden."));
        const updated = await response.json() as IncomingInvoice;
        await mutate((current = []) => current.map((invoice) => invoice.id === updated.id ? updated : invoice), false);
        return updated;
    };

    const extractIncomingInvoice = async (id: string) => {
        const response = await fetch(`/api/incoming-invoices/${encodeURIComponent(id)}/extract`, { method: "POST" });
        if (!response.ok) throw new Error(await errorMessage(response, "Die KI-Auslesung konnte nicht abgeschlossen werden."));
        const payload = await response.json() as { invoice: IncomingInvoice; warnings?: string[]; itemCount?: number };
        await mutate((current = []) => current.map((invoice) => invoice.id === payload.invoice.id ? payload.invoice : invoice), false);
        return payload;
    };

    const decideIncomingInvoice = async (id: string, decision: "reject" | "duplicate", reason: string) => {
        const response = await fetch(`/api/incoming-invoices/${encodeURIComponent(id)}/decision`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reason }),
        });
        if (!response.ok) throw new Error(await errorMessage(response, "Prüfentscheidung konnte nicht gespeichert werden."));
        const updated = await response.json() as IncomingInvoice;
        await mutate((current = []) => current.map((invoice) => invoice.id === updated.id ? updated : invoice), false);
        return updated;
    };

    return { incomingInvoices: data, isLoading, uploadIncomingInvoice: upload, openIncomingInvoiceDocument: openDocument, getIncomingInvoiceDocumentUrl: getDocumentUrl, updateIncomingInvoice, extractIncomingInvoice, decideIncomingInvoice, mutate };
}
