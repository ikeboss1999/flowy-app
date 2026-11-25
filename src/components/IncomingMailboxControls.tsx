"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Status = { enabled: boolean; lastCheckedAt: string | null; lastError: string | null };

export function IncomingMailboxControls() {
    const [status, setStatus] = useState<Status | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const refresh = useCallback(async () => {
        const response = await fetch("/api/incoming-invoices/mailbox", { cache: "no-store" });
        const data = await response.json();
        if (response.ok) setStatus(data.settings || null);
    }, []);
    useEffect(() => {
        const update = () => { void refresh().catch(() => undefined); };
        update();
        window.addEventListener("flowy-mailbox-updated", update);
        return () => window.removeEventListener("flowy-mailbox-updated", update);
    }, [refresh]);

    const run = async (action: "enable" | "disable" | "sync") => {
        setBusy(true); setMessage("");
        try {
            const response = await fetch("/api/incoming-invoices/mailbox/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Der Postfachabruf ist fehlgeschlagen.");
            setMessage(action === "disable" ? "Automatischer Abruf deaktiviert." : result.initialized ? "Postfach eingerichtet. Neue E-Mails ab jetzt werden berücksichtigt." : `${result.emailsChecked} neue E-Mails geprüft, ${result.attachmentsChecked} unterstützte Anhänge, ${result.imported} neue Rechnungsbelege übernommen${result.notInvoices ? `, ${result.notInvoices} keine Rechnungen` : ""}${result.previous ? `, ${result.previous} bereits verarbeitet` : ""}.`);
            await refresh();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Der Postfachabruf ist fehlgeschlagen."); }
        finally { setBusy(false); }
    };
    return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-black text-slate-900">Automatischer Rechnungseingang</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Nach dem Speichern der Zugangsdaten kannst du den Abruf aktivieren. Bereits vorhandene E-Mails werden bei der ersten Einrichtung nicht importiert. Danach prüft FlowY das Postfach täglich; ein manueller Abruf ist jederzeit möglich.</p><p className="mt-3 text-sm font-bold text-slate-700">Status: {status?.enabled ? "Aktiv" : "Nicht aktiviert"}{status?.lastCheckedAt ? ` · Letzter Abruf: ${new Intl.DateTimeFormat("de-AT", { dateStyle: "short", timeStyle: "short" }).format(new Date(status.lastCheckedAt))}` : ""}</p>{status?.lastError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Letzter Fehler: {status.lastError}</p>}{message && <p role="status" className="mt-3 text-sm font-semibold text-indigo-700">{message}</p>}<div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void run(status?.enabled ? "disable" : "enable")} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{status?.enabled ? "Automatischen Abruf deaktivieren" : "Automatischen Abruf aktivieren"}</button>{status?.enabled && <button type="button" disabled={busy} onClick={() => void run("sync")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50">Jetzt abrufen</button>}</div></section>;
}
