"use client";

import { useEffect, useState } from "react";
import { Inbox, Loader2 } from "lucide-react";

type Mailbox = { host: string; port: number; username: string; mailbox: string; password: string };
const empty: Mailbox = { host: "", port: 993, username: "", mailbox: "INBOX", password: "" };
const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export function IncomingMailboxSettings() {
    const [form, setForm] = useState<Mailbox>(empty);
    const [hasPassword, setHasPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        let active = true;
        fetch("/api/incoming-invoices/mailbox").then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "IMAP-Einstellungen konnten nicht geladen werden.");
            if (active && data.settings) { setForm({ ...empty, ...data.settings, password: "" }); setHasPassword(data.hasPassword); }
        }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "IMAP-Einstellungen konnten nicht geladen werden."); });
        return () => { active = false; };
    }, []);

    const save = async () => {
        setBusy(true); setMessage("");
        try {
            const response = await fetch("/api/incoming-invoices/mailbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Speichern fehlgeschlagen.");
            setHasPassword(true); setForm((previous) => ({ ...previous, password: "" }));
            window.dispatchEvent(new Event("flowy-mailbox-updated"));
            setMessage("Zugangsdaten gespeichert. Der automatische Abruf ist noch nicht aktiv.");
        } catch (error) { setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen."); }
        finally { setBusy(false); }
    };

    const testConnection = async () => {
        setTesting(true); setMessage("");
        try {
            const response = await fetch("/api/incoming-invoices/mailbox/test", { method: "POST" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Verbindungstest fehlgeschlagen.");
            setMessage("Verbindung zum Postfach erfolgreich. Der Abrufstatus steht im Abschnitt darunter.");
        } catch (error) { setMessage(error instanceof Error ? error.message : "Verbindungstest fehlgeschlagen."); }
        finally { setTesting(false); }
    };

    return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Inbox className="h-5 w-5" /></span><div><h3 className="font-black text-slate-900">IMAP für Eingangsrechnungen</h3><p className="text-sm text-slate-500">Postfach für den späteren automatischen Empfang.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">IMAP-Server<input className={`${input} mt-2`} value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} placeholder="imap.mail.com" /></label><label className="text-sm font-bold text-slate-700">Port (SSL/TLS)<input className={`${input} mt-2`} type="number" value={form.port} onChange={(event) => setForm({ ...form, port: Number(event.target.value) })} /></label><label className="text-sm font-bold text-slate-700">Benutzername<input className={`${input} mt-2`} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" /></label><label className="text-sm font-bold text-slate-700">Passwort<input className={`${input} mt-2`} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" placeholder={hasPassword ? "Gespeichertes Passwort beibehalten" : "Passwort eingeben"} /></label><label className="text-sm font-bold text-slate-700 sm:col-span-2">Postfachordner<input className={`${input} mt-2`} value={form.mailbox} onChange={(event) => setForm({ ...form, mailbox: event.target.value })} /></label></div>{message && <p role="status" className="mt-4 text-sm font-semibold text-slate-600">{message}</p>}<div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy || testing} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Zugangsdaten speichern</button><button type="button" disabled={!hasPassword || busy || testing} onClick={() => void testConnection()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50">{testing && <Loader2 className="h-4 w-4 animate-spin" />}Gespeicherte Verbindung testen</button></div></section>;
}
