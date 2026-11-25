"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { IncomingInvoice } from "@/types/incoming-invoice";

type Statement = { id: string; originalFileName: string; status: string; errorMessage?: string | null; createdAt: string };
type Transaction = { id: string; statementId: string; bookingDate: string | null; counterparty: string | null; description: string; reference: string | null; iban: string | null; amount: number; currency: string; matchedInvoiceId: string | null };
const amount = (value: number, currency: string) => new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(value);

function candidates(transaction: Transaction, invoices: IncomingInvoice[]) {
    if (Number(transaction.amount) >= 0 || transaction.matchedInvoiceId) return [];
    return invoices.filter((invoice) => {
        const gross = invoice.grossAmount == null ? null : Number(invoice.grossAmount);
        const discounted = invoice.discountedGrossAmount == null ? null : Number(invoice.discountedGrossAmount);
        const paid = Math.abs(Number(transaction.amount));
        return invoice.status === "approved" && invoice.currency === transaction.currency && ((gross !== null && Math.abs(gross - paid) <= 0.01) || (discounted !== null && invoice.discountDueDate && transaction.bookingDate && transaction.bookingDate <= invoice.discountDueDate && Math.abs(discounted - paid) <= 0.01));
    }).sort((a, b) => {
        const text = `${transaction.counterparty || ""} ${transaction.reference || ""} ${transaction.description}`.toLocaleLowerCase("de-AT");
        const score = (invoice: IncomingInvoice) => (invoice.invoiceNumber && text.includes(invoice.invoiceNumber.toLocaleLowerCase("de-AT")) ? 2 : 0) + (invoice.supplierName && text.includes(invoice.supplierName.toLocaleLowerCase("de-AT")) ? 1 : 0);
        return score(b) - score(a);
    });
}

export function IncomingBankStatements({ invoices, onInvoicesChanged }: { invoices: IncomingInvoice[]; onInvoicesChanged: () => Promise<unknown> }) {
    const [statements, setStatements] = useState<Statement[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [chosen, setChosen] = useState<Record<string, string>>({});
    const [confirming, setConfirming] = useState<{ tx: Transaction; invoice: IncomingInvoice } | null>(null);

    const refresh = useCallback(async () => {
        const response = await fetch("/api/incoming-invoices/statements", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Kontoauszüge konnten nicht geladen werden.");
        setStatements(data.statements); setTransactions(data.transactions);
    }, []);
    useEffect(() => { void refresh().catch((error) => setMessage(error.message)); }, [refresh]);

    const upload = async (file: File) => {
        setBusy(true); setMessage("");
        try {
            const prepare = await fetch("/api/incoming-invoices/statements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare", name: file.name, size: file.size }) });
            const prepared = await prepare.json();
            if (!prepare.ok) throw new Error(prepared.error || "Upload konnte nicht vorbereitet werden.");
            const { error } = await supabase.storage.from("incoming-bank-statements").uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: "application/pdf" });
            if (error) throw error;
            const response = await fetch("/api/incoming-invoices/statements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "process", id: prepared.id, path: prepared.path, name: file.name }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Kontoauszug konnte nicht ausgelesen werden.");
            setMessage(`${result.count} Buchungen erkannt. Bitte prüfe die Daten anhand des Originals.`);
            await refresh();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Kontoauszug konnte nicht importiert werden."); await refresh().catch(() => undefined); }
        finally { setBusy(false); }
    };

    const confirm = async () => {
        if (!confirming) return;
        setBusy(true); setMessage("");
        try {
            const response = await fetch("/api/incoming-invoices/statements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm", transactionId: confirming.tx.id, invoiceId: confirming.invoice.id }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Zuordnung fehlgeschlagen.");
            setConfirming(null); setMessage("Zahlung zugeordnet und Rechnung als bezahlt markiert.");
            await Promise.all([refresh(), onInvoicesChanged()]);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Zuordnung fehlgeschlagen."); setConfirming(null); }
        finally { setBusy(false); }
    };

    const openStatement = async (id: string) => {
        const view = window.open("", "_blank");
        try {
            const response = await fetch(`/api/incoming-invoices/statements?fileId=${encodeURIComponent(id)}`);
            const data = await response.json();
            if (!response.ok || !data.url) throw new Error(data.error || "Kontoauszug konnte nicht geöffnet werden.");
            if (view) { view.opener = null; view.location.href = data.url; }
            else setMessage("Bitte Pop-ups erlauben, um den Originalauszug zu öffnen.");
        } catch (error) { view?.close(); setMessage(error instanceof Error ? error.message : "Kontoauszug konnte nicht geöffnet werden."); }
    };

    return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-500">Finanzen</p><h2 className="mt-2 text-2xl font-black text-slate-950">Kontoauszüge & Zahlungsabgleich</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">PDF hochladen, erkannte Buchungen kontrollieren und Zahlungen ausdrücklich zuordnen.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}PDF hochladen<input type="file" accept="application/pdf,.pdf" className="hidden" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></label></div>{message && <p role="status" className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-800">{message}</p>}<div className="mt-6 flex flex-wrap gap-2">{statements.map((item) => <button type="button" onClick={() => void openStatement(item.id)} key={item.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600" title={item.errorMessage || undefined}><FileText className="h-4 w-4" />{item.originalFileName} · {item.status === "review" ? "Ausgelesen" : item.status === "failed" ? "Fehler" : "In Bearbeitung"}</button>)}</div><div className="mt-6 space-y-3">{transactions.length === 0 && <p className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Noch keine Buchungen vorhanden.</p>}{transactions.map((tx) => {
        const matches = candidates(tx, invoices); const selected = matches.find((invoice) => invoice.id === chosen[tx.id]);
        return <article key={tx.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black text-slate-900">{tx.counterparty || "Unbekannter Zahlungspartner"}</p><p className="mt-1 text-sm text-slate-500">{tx.bookingDate || "Datum nicht erkannt"} · {tx.description}</p>{tx.reference && <p className="mt-1 text-xs text-slate-400">Referenz: {tx.reference}</p>}</div><p className="font-black text-slate-900">{amount(Number(tx.amount), tx.currency)}</p></div>{tx.matchedInvoiceId ? <p className="mt-4 text-sm font-bold text-emerald-700">Zahlung zugeordnet</p> : matches.length ? <div className="mt-4 flex flex-wrap gap-2"><select className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={chosen[tx.id] || ""} onChange={(event) => setChosen({ ...chosen, [tx.id]: event.target.value })}><option value="">Rechnung auswählen …</option>{matches.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber || "Ohne Nummer"} · {invoice.supplierName || "Lieferant unbekannt"}</option>)}</select><button type="button" disabled={!selected || busy} onClick={() => selected && setConfirming({ tx, invoice: selected })} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Zuordnen</button></div> : Number(tx.amount) < 0 ? <p className="mt-4 text-xs font-semibold text-slate-400">Keine freigegebene Rechnung mit passendem Betrag gefunden.</p> : <p className="mt-4 text-xs font-semibold text-slate-400">Eingang – kein Abgleich mit Eingangsrechnungen.</p>}</article>;
    })}</div>{confirming && <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-black text-slate-950">Zahlung wirklich zuordnen?</h3><p className="mt-3 text-sm leading-relaxed text-slate-600">Die Buchung über {amount(Math.abs(Number(confirming.tx.amount)), confirming.tx.currency)} wird der Rechnung {confirming.invoice.invoiceNumber || "ohne Nummer"} von {confirming.invoice.supplierName || "unbekannt"} zugeordnet und die Rechnung als bezahlt markiert. Bitte prüfe den Originalauszug und die Referenz.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setConfirming(null)} className="rounded-xl border px-4 py-2 font-bold">Abbrechen</button><button type="button" disabled={busy} onClick={() => void confirm()} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Bestätigen</button></div></section></div>}</section>;
}
