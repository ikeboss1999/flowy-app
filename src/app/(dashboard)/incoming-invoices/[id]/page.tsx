"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, Building2, CheckCircle2, Copy, FileSearch, Loader2, Save, ShieldCheck, Sparkles, X } from "lucide-react";
import { useIncomingInvoices } from "@/hooks/useIncomingInvoices";
import { useSuppliers } from "@/hooks/useSuppliers";
import { IncomingInvoice } from "@/types/incoming-invoice";

type InvoiceForm = {
    supplierId: string;
    supplierName: string;
    supplierVatNumber: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    discountDueDate: string;
    discountPercent: string;
    netAmount: string;
    taxAmount: string;
    grossAmount: string;
    currency: string;
    paymentTerms: string;
    category: string;
    paymentReference: string;
    iban: string;
    bic: string;
    notes: string;
};

const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";
const label = "mb-2 block px-1 text-[10px] font-black uppercase tracking-widest text-slate-400";

function makeForm(invoice: IncomingInvoice): InvoiceForm {
    const date = (value?: string | null) => value?.slice(0, 10) || "";
    const amount = (value?: number | null) => value == null ? "" : String(value);
    return {
        supplierId: invoice.supplierId || "",
        supplierName: invoice.supplierName || "",
        supplierVatNumber: invoice.supplierVatNumber || "",
        invoiceNumber: invoice.invoiceNumber || "",
        issueDate: date(invoice.issueDate), dueDate: date(invoice.dueDate), discountDueDate: date(invoice.discountDueDate),
        discountPercent: amount(invoice.discountPercent), netAmount: amount(invoice.netAmount), taxAmount: amount(invoice.taxAmount), grossAmount: amount(invoice.grossAmount),
        currency: invoice.currency || "EUR", paymentTerms: invoice.paymentTerms || "", category: invoice.category || "", paymentReference: invoice.paymentReference || "",
        iban: invoice.iban || "", bic: invoice.bic || "", notes: invoice.notes || "",
    };
}

export default function IncomingInvoiceReviewPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const { incomingInvoices, isLoading, updateIncomingInvoice, extractIncomingInvoice, decideIncomingInvoice, mutate: mutateIncomingInvoices } = useIncomingInvoices();
    const { suppliers, mutate: mutateSuppliers } = useSuppliers();
    const invoice = useMemo(() => incomingInvoices.find((item) => item.id === params.id), [incomingInvoices, params.id]);
    const [form, setForm] = useState<InvoiceForm | null>(null);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<"review" | "approve" | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [creatingSupplier, setCreatingSupplier] = useState(false);
    const [decision, setDecision] = useState<"reject" | "duplicate" | null>(null);
    const [decisionReason, setDecisionReason] = useState("");
    const [deciding, setDeciding] = useState(false);

    useEffect(() => { if (invoice) setForm(makeForm(invoice)); }, [invoice]);
    useEffect(() => {
        if (!invoice) return;
        let active = true;
        fetch(`/api/incoming-invoices/file-url?id=${encodeURIComponent(invoice.id)}`)
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(payload.error || "Beleg konnte nicht geladen werden.");
                return payload.url as string;
            })
            .then((url) => { if (active) setDocumentUrl(url); })
            .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Beleg konnte nicht geladen werden."); });
        return () => { active = false; };
    }, [invoice?.id]);

    const change = (key: keyof InvoiceForm, value: string) => setForm((current) => current ? { ...current, [key]: value } : current);
    const selectSupplier = (supplierId: string) => {
        const supplier = suppliers.find((item) => item.id === supplierId);
        setForm((current) => current ? { ...current, supplierId, supplierName: supplier?.name || current.supplierName, supplierVatNumber: supplier?.vatNumber || current.supplierVatNumber } : current);
    };
    const nullableNumber = (value: string) => value.trim() === "" ? null : Number(value.replace(",", "."));
    const nullableText = (value: string) => value.trim() || null;
    const save = async (action: "review" | "approve") => {
        if (!invoice || !form) return;
        setSaving(action); setError(null);
        try {
            await updateIncomingInvoice(invoice.id, {
                supplierId: nullableText(form.supplierId), supplierName: nullableText(form.supplierName), supplierVatNumber: nullableText(form.supplierVatNumber),
                invoiceNumber: nullableText(form.invoiceNumber), issueDate: nullableText(form.issueDate), dueDate: nullableText(form.dueDate), discountDueDate: nullableText(form.discountDueDate),
                discountPercent: nullableNumber(form.discountPercent), netAmount: nullableNumber(form.netAmount), taxAmount: nullableNumber(form.taxAmount), grossAmount: nullableNumber(form.grossAmount),
                currency: form.currency.trim().toUpperCase() || "EUR", paymentTerms: nullableText(form.paymentTerms), category: nullableText(form.category), paymentReference: nullableText(form.paymentReference),
                iban: nullableText(form.iban.toUpperCase()), bic: nullableText(form.bic.toUpperCase()), notes: nullableText(form.notes),
                status: action === "approve" ? "approved" : "review", reviewRequired: action !== "approve",
            });
            router.push("/incoming-invoices");
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Eingangsrechnung konnte nicht gespeichert werden."); }
        finally { setSaving(null); }
    };

    const extract = async () => {
        if (!invoice) return;
        setExtracting(true); setError(null);
        try {
            const result = await extractIncomingInvoice(invoice.id);
            setForm(makeForm(result.invoice));
            const warnings = result.warnings?.filter(Boolean) || [];
            if (warnings.length) setError(`KI-Auslesung abgeschlossen. Bitte prüfen: ${warnings.join(" ")}`);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "KI-Auslesung konnte nicht abgeschlossen werden.");
        } finally { setExtracting(false); }
    };

    const createSupplier = async () => {
        if (!invoice || !form || !form.supplierName.trim()) return;
        setCreatingSupplier(true); setError(null);
        try {
            const response = await fetch(`/api/incoming-invoices/${encodeURIComponent(invoice.id)}/create-supplier`, { method: "POST" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "Lieferant konnte nicht angelegt werden.");
            const supplierId = String(payload.supplierId || "");
            setForm((current) => current ? { ...current, supplierId } : current);
            await Promise.all([mutateIncomingInvoices(), mutateSuppliers()]);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Lieferant konnte nicht angelegt werden.");
        } finally { setCreatingSupplier(false); }
    };

    const submitDecision = async () => {
        if (!invoice || !decision) return;
        setDeciding(true); setError(null);
        try {
            await decideIncomingInvoice(invoice.id, decision, decisionReason);
            router.push("/incoming-invoices");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Prüfentscheidung konnte nicht gespeichert werden.");
        } finally { setDeciding(false); }
    };

    if (isLoading || !form || !invoice) return <div className="dashboard-page flex min-h-[50vh] items-center justify-center"><div className="rounded-3xl border border-slate-100 bg-white px-6 py-4 font-black text-slate-400 shadow-sm">Eingangsrechnung wird geladen...</div></div>;

    if (invoice.status === "rejected") return <div className="dashboard-page flex min-h-[60vh] items-center justify-center px-4"><section className="w-full max-w-xl rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-xl shadow-rose-100/60"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600"><Ban className="h-8 w-8" /></span><p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-rose-500">Prüfung abgeschlossen</p><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Diese Rechnung wurde abgelehnt.</h1><p className="mx-auto mt-3 max-w-md font-medium leading-relaxed text-slate-500">Abgelehnte Rechnungen sind abgeschlossen. Sie können nicht mehr bearbeitet, erneut ausgelesen oder freigegeben werden.</p><div className="mx-auto mt-6 max-w-md rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-left"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Ablehnungsgrund</p><p className="mt-2 font-bold leading-relaxed text-rose-950">{invoice.decisionReason || "Kein Ablehnungsgrund wurde gespeichert."}</p>{invoice.decisionAt && <p className="mt-2 text-xs font-semibold text-rose-700">Entschieden am {new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invoice.decisionAt))}</p>}</div><button type="button" onClick={() => router.push("/incoming-invoices")} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"><ArrowLeft className="h-4 w-4" />Zur Übersicht</button></section></div>;

    return <div className="dashboard-page space-y-6">
        <button type="button" onClick={() => router.push("/incoming-invoices")} className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Zurück zu Eingangsrechnungen</button>
        <section className="rounded-[2.25rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-7 text-white shadow-xl shadow-indigo-950/15"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100">Belegprüfung</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Eingangsrechnung prüfen</h1><p className="mt-2 font-semibold text-white/65">{invoice.originalFileName}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-50"><ShieldCheck className="h-5 w-5 text-amber-300" /> Manuelle Prüfung</span></div></section>
        <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.06fr)_minmax(32rem,0.94fr)]">
            <section className="self-start overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-xl 2xl:sticky 2xl:top-6"><div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 text-white"><FileSearch className="h-5 w-5 text-cyan-200" /><span className="font-black">Originalbeleg</span></div>{documentUrl ? <iframe src={documentUrl} title={`Vorschau ${invoice.originalFileName}`} className="h-[43rem] w-full bg-white 2xl:h-[calc(100vh-6rem)]" /> : <div className="flex h-[43rem] items-center justify-center text-sm font-bold text-white/60 2xl:h-[calc(100vh-6rem)]"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Vorschau wird geladen...</div>}</section>
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-7"><p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Rechnungsdaten</p><h2 className="mt-2 text-2xl font-black text-slate-950">Daten kontrollieren und ergänzen</h2><p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Die automatische Auslesung wird im nächsten Schritt ergänzt. Bereits jetzt können Sie jeden Wert manuell erfassen und freigeben.</p></div>
                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-indigo-950">Rechnungsdaten mit KI auslesen</p><p className="mt-1 text-sm font-medium text-indigo-700">Der Originalbeleg wird analysiert und alle erkannten Werte zur Kontrolle eingetragen.</p></div><button type="button" onClick={() => void extract()} disabled={extracting || !!saving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{extracting ? "Wird ausgelesen..." : "Mit KI auslesen"}</button></div>
                {error && <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
                <div className="space-y-6"><section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-black text-slate-900">Lieferant</h3>{!form.supplierId && form.supplierName.trim() && <button type="button" onClick={() => void createSupplier()} disabled={creatingSupplier} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60">{creatingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}{creatingSupplier ? "Wird angelegt..." : "Lieferant anlegen & zuordnen"}</button>}</div><div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><label className={label}>Bestehenden Lieferanten zuordnen</label><select className={input} value={form.supplierId} onChange={(event) => selectSupplier(event.target.value)}><option value="">Noch nicht zugeordnet</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.supplierNumber})</option>)}</select></div><div><label className={label}>Lieferantenname</label><input className={input} value={form.supplierName} onChange={(event) => change("supplierName", event.target.value)} /></div><div><label className={label}>UID-Nummer</label><input className={input} value={form.supplierVatNumber} onChange={(event) => change("supplierVatNumber", event.target.value.toUpperCase())} /></div></div></section>
                <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5"><h3 className="mb-4 font-black text-slate-900">Rechnung</h3><div className="grid gap-4 md:grid-cols-2"><div><label className={label}>Rechnungsnummer</label><input className={input} value={form.invoiceNumber} onChange={(event) => change("invoiceNumber", event.target.value)} /></div><div><label className={label}>Kategorie</label><input className={input} value={form.category} onChange={(event) => change("category", event.target.value)} placeholder="z. B. Baumaterial" /></div><div><label className={label}>Rechnungsdatum</label><input className={input} type="date" value={form.issueDate} onChange={(event) => change("issueDate", event.target.value)} /></div><div><label className={label}>Fällig am</label><input className={input} type="date" value={form.dueDate} onChange={(event) => change("dueDate", event.target.value)} /></div><div><label className={label}>Skonto bis</label><input className={input} type="date" value={form.discountDueDate} onChange={(event) => change("discountDueDate", event.target.value)} /></div><div><label className={label}>Skonto in %</label><input className={input} inputMode="decimal" value={form.discountPercent} onChange={(event) => change("discountPercent", event.target.value)} /></div></div></section>
                <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5"><h3 className="mb-4 font-black text-slate-900">Beträge & Zahlung</h3><div className="grid gap-4 md:grid-cols-2"><div><label className={label}>Nettobetrag</label><input className={input} inputMode="decimal" value={form.netAmount} onChange={(event) => change("netAmount", event.target.value)} /></div><div><label className={label}>Umsatzsteuer</label><input className={input} inputMode="decimal" value={form.taxAmount} onChange={(event) => change("taxAmount", event.target.value)} /></div><div><label className={label}>Bruttobetrag</label><input className={input} inputMode="decimal" value={form.grossAmount} onChange={(event) => change("grossAmount", event.target.value)} /></div><div><label className={label}>Währung</label><input className={input} maxLength={3} value={form.currency} onChange={(event) => change("currency", event.target.value.toUpperCase())} /></div><div className="md:col-span-2"><label className={label}>Zahlungskondition</label><input className={input} value={form.paymentTerms} onChange={(event) => change("paymentTerms", event.target.value)} placeholder="z. B. 14 Tage netto" /></div><div><label className={label}>IBAN</label><input className={input} value={form.iban} onChange={(event) => change("iban", event.target.value.toUpperCase())} /></div><div><label className={label}>BIC</label><input className={input} value={form.bic} onChange={(event) => change("bic", event.target.value.toUpperCase())} /></div><div className="md:col-span-2"><label className={label}>Zahlungsreferenz</label><input className={input} value={form.paymentReference} onChange={(event) => change("paymentReference", event.target.value)} /></div></div></section>
                <section><label className={label}>Interne Notizen</label><textarea className={`${input} min-h-28 resize-y`} value={form.notes} onChange={(event) => change("notes", event.target.value)} placeholder="Hinweise zur Rechnung ..." /></section></div>
                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setDecision("reject"); setDecisionReason(""); }} disabled={!!saving} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"><Ban className="h-4 w-4" />Ablehnen</button><button type="button" onClick={() => { setDecision("duplicate"); setDecisionReason(""); }} disabled={!!saving} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"><Copy className="h-4 w-4" />Als Dublette markieren</button></div><div className="flex flex-col-reverse gap-3 sm:flex-row"><button type="button" onClick={() => void save("review")} disabled={!!saving} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">{saving === "review" && <Loader2 className="h-4 w-4 animate-spin" />}<Save className="h-4 w-4" />Zur Prüfung speichern</button><button type="button" onClick={() => void save("approve")} disabled={!!saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-60">{saving === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Freigeben</button></div></div>
            </section>
        </div>
        {decision && <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${decision === "reject" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>{decision === "reject" ? <Ban /> : <Copy />}</span><h2 className="mt-5 text-2xl font-black text-slate-950">{decision === "reject" ? "Rechnung ablehnen" : "Als Dublette markieren"}</h2><p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{decision === "reject" ? "Die Rechnung wird nicht freigegeben. Der Grund wird revisionssicher protokolliert." : "Die Rechnung bleibt sichtbar und wird klar als Doppelübermittlung markiert."}</p></div><button type="button" onClick={() => setDecision(null)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Schließen"><X className="h-5 w-5" /></button></div><div className="mt-6"><label className={label}>Grund *</label><textarea autoFocus className={`${input} min-h-28 resize-y`} value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder={decision === "reject" ? "z. B. keine geschäftliche Ausgabe oder unleserlicher Beleg" : "z. B. Rechnung wurde bereits am selben Tag importiert"} /></div><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDecision(null)} disabled={deciding} className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-600">Abbrechen</button><button type="button" onClick={() => void submitDecision()} disabled={deciding || decisionReason.trim().length < 3} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${decision === "reject" ? "bg-rose-600 shadow-rose-200 hover:bg-rose-700" : "bg-amber-500 shadow-amber-200 hover:bg-amber-600"}`}>{deciding && <Loader2 className="h-4 w-4 animate-spin" />}{decision === "reject" ? "Rechnung ablehnen" : "Dublette markieren"}</button></div></section></div>}
    </div>;
}
