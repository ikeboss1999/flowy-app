"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight, Building2, CalendarClock, CircleAlert, Flag,
    Eye, FileSearch, Files, Landmark, Loader2, Plus, ReceiptText, Search,
    UploadCloud, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useIncomingInvoices } from "@/hooks/useIncomingInvoices";
import { IncomingInvoice, IncomingInvoiceStatus } from "@/types/incoming-invoice";
import { supabase } from "@/lib/supabase";
import { IncomingBankStatements } from "@/components/IncomingBankStatements";

type SectionId = "overview" | "invoices" | "statements" | "suppliers";
type InvoiceFilter = "all" | "new" | "review" | "approved" | "paid" | "duplicate" | "discount";
type DateFilter = "all" | "today" | "last7" | "currentMonth" | "custom" | `month:${string}`;

const sections: Array<{ id: SectionId; label: string; description: string; icon: typeof ReceiptText }> = [
    { id: "overview", label: "Übersicht", description: "Alles Wichtige auf einen Blick", icon: ReceiptText },
    { id: "invoices", label: "Rechnungen", description: "Eingegangene Belege prüfen", icon: Files },
    { id: "statements", label: "Kontoauszüge", description: "Zahlungen später abgleichen", icon: Landmark },
    { id: "suppliers", label: "Lieferanten", description: "Lieferanten zentral verwalten", icon: Building2 },
];

const statusLabel: Record<IncomingInvoiceStatus, string> = {
    new: "Neu", extracting: "Wird ausgelesen", review: "In Prüfung", approved: "Freigegeben", paid: "Bezahlt", overdue: "Überfällig", duplicate: "Dublette", rejected: "Abgelehnt", failed: "Fehler",
};

function euro(value?: number | null, currency = "EUR") {
    if (value == null) return "–";
    return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(value);
}

function formatDate(value?: string | null) {
    if (!value) return "–";
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "–" : new Intl.DateTimeFormat("de-AT").format(date);
}

function stateTone(invoice: IncomingInvoice) {
    if (invoice.status === "rejected") return "bg-rose-50 text-rose-700 ring-rose-100";
    if (invoice.isDuplicate || invoice.status === "duplicate") return "bg-amber-50 text-amber-700 ring-amber-100";
    if (invoice.status === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    if (invoice.status === "paid") return "bg-slate-100 text-slate-600 ring-slate-200";
    if (invoice.status === "overdue" || invoice.status === "failed") return "bg-rose-50 text-rose-700 ring-rose-100";
    if (invoice.status === "review") return "bg-violet-50 text-violet-700 ring-violet-100";
    return "bg-indigo-50 text-indigo-700 ring-indigo-100";
}

function hasImminentDiscount(invoice: IncomingInvoice, today: string) {
    if (!invoice.discountDueDate || ["paid", "rejected"].includes(invoice.status)) return false;
    const limit = new Date(`${today}T12:00:00`);
    limit.setDate(limit.getDate() + 3);
    const discountDate = invoice.discountDueDate.slice(0, 10);
    return discountDate >= today && discountDate <= limit.toISOString().slice(0, 10);
}

export default function IncomingInvoicesPage() {
    usePermissionGuard("invoices_read");
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<SectionId>("overview");
    const [filter, setFilter] = useState<InvoiceFilter>("all");
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [customDateFrom, setCustomDateFrom] = useState("");
    const [customDateTo, setCustomDateTo] = useState("");
    const [search, setSearch] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pendingPdf, setPendingPdf] = useState<{ file: File; pageCount: number } | null>(null);
    const [pageStarts, setPageStarts] = useState<number[]>([1]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { incomingInvoices, isLoading, uploadIncomingInvoice, openIncomingInvoiceDocument, updateIncomingInvoice, extractIncomingInvoice, mutate: refreshIncomingInvoices } = useIncomingInvoices();

    const counters = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return {
            new: incomingInvoices.filter((invoice) => invoice.status === "new").length,
            review: incomingInvoices.filter((invoice) => invoice.status === "review" || invoice.status === "extracting").length,
            dueToday: incomingInvoices.filter((invoice) => invoice.dueDate === today && !["paid", "rejected"].includes(invoice.status)).length,
            duplicates: incomingInvoices.filter((invoice) => invoice.isDuplicate || invoice.status === "duplicate").length,
            paid: incomingInvoices.filter((invoice) => invoice.status === "paid").length,
            discount: incomingInvoices.filter((invoice) => hasImminentDiscount(invoice, today)).length,
        };
    }, [incomingInvoices]);

    const availableMonths = useMemo(() => Array.from(new Set(incomingInvoices.map((invoice) => invoice.issueDate?.slice(0, 7)).filter((value): value is string => Boolean(value)))).sort((left, right) => right.localeCompare(left)), [incomingInvoices]);

    const filteredInvoices = useMemo(() => {
        const query = search.trim().toLowerCase();
        return incomingInvoices.filter((invoice) => {
            const matchesFilter = filter === "all" || (filter === "duplicate" ? invoice.isDuplicate || invoice.status === "duplicate" : filter === "discount" ? hasImminentDiscount(invoice, new Date().toISOString().slice(0, 10)) : invoice.status === filter);
            const today = new Date().toISOString().slice(0, 10);
            const date = invoice.issueDate?.slice(0, 10) || "";
            const sevenDaysAgo = new Date(`${today}T12:00:00`); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            const matchesDate = dateFilter === "all" || (dateFilter === "today" ? date === today : dateFilter === "last7" ? date >= sevenDaysAgo.toISOString().slice(0, 10) && date <= today : dateFilter === "currentMonth" ? date.startsWith(today.slice(0, 7)) : dateFilter === "custom" ? Boolean(date) && (!customDateFrom || date >= customDateFrom) && (!customDateTo || date <= customDateTo) : date.startsWith(dateFilter.slice(6)));
            const matchesSearch = !query || [invoice.supplierName, invoice.invoiceNumber, invoice.originalFileName, invoice.category].some((value) => String(value || "").toLowerCase().includes(query));
            return matchesFilter && matchesDate && matchesSearch;
        });
    }, [incomingInvoices, filter, dateFilter, search, customDateFrom, customDateTo]);

    const processInvoiceFile = async (file: File) => {
        const invoice = await uploadIncomingInvoice(file);
        setActiveSection("invoices"); setFilter("review");
        const result = await extractIncomingInvoice(invoice.id);
        if (!result.invoice.supplierId && result.invoice.supplierName) {
            const supplierResponse = await fetch(`/api/incoming-invoices/${encodeURIComponent(invoice.id)}/create-supplier`, { method: "POST" });
            if (!supplierResponse.ok) console.warn("[IncomingInvoices] automatic supplier assignment skipped", await supplierResponse.json().catch(() => null));
        }
    };

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setIsUploading(true); setUploadError(null);
        try {
            if (file.type === "application/pdf") {
                const { PDFDocument } = await import("pdf-lib");
                const document = await PDFDocument.load(await file.arrayBuffer());
                if (document.getPageCount() > 1) {
                    const prepare = await fetch("/api/incoming-invoices/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size }) });
                    const prepared = await prepare.json();
                    if (!prepare.ok) throw new Error(prepared.error || "Upload konnte nicht vorbereitet werden.");
                    const { error: storageError } = await supabase.storage.from("incoming-invoices").uploadToSignedUrl(prepared.path, prepared.token, file);
                    if (storageError) throw storageError;
                    const classification = await fetch("/api/incoming-invoices/classify-pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: prepared.path, importId: prepared.importId }) });
                    const result = await classification.json();
                    if (!classification.ok) throw new Error(result.error || "Die Seitenerkennung ist fehlgeschlagen.");
                    const starts = (result.groups as Array<{ from: number }>).map((group) => group.from);
                    if (result.uncertain) {
                        setPageStarts(starts);
                        setPendingPdf({ file, pageCount: document.getPageCount() });
                    } else {
                        await importPdfGroups({ file, pageCount: document.getPageCount() }, starts);
                    }
                    return;
                }
            }
            await processInvoiceFile(file);
        }
        catch (error) { setUploadError(error instanceof Error ? error.message : "Die Datei konnte nicht importiert werden."); }
        finally { setIsUploading(false); }
    };

    const importPdfGroups = async (input = pendingPdf, selectedStarts = pageStarts) => {
        if (!input) return;
        const { file, pageCount } = input;
        setPendingPdf(null); setIsUploading(true); setUploadError(null);
        let completed = 0;
        try {
            const starts = [...selectedStarts].sort((a, b) => a - b);
            if (starts.length === 1) {
                await processInvoiceFile(file);
                return;
            }
            const { PDFDocument } = await import("pdf-lib");
            const original = await PDFDocument.load(await file.arrayBuffer());
            for (let index = 0; index < starts.length; index++) {
                const from = starts[index];
                const to = (starts[index + 1] || pageCount + 1) - 1;
                const part = await PDFDocument.create();
                const pages = await part.copyPages(original, Array.from({ length: to - from + 1 }, (_, offset) => from - 1 + offset));
                pages.forEach((page) => part.addPage(page));
                const bytes = await part.save();
                const name = `${file.name.replace(/\.pdf$/i, "")}-Seiten-${from}-${to}.pdf`;
                await processInvoiceFile(new File([new Blob([new Uint8Array(bytes)], { type: "application/pdf" })], name, { type: "application/pdf" }));
                completed++;
            }
        } catch (error) {
            setUploadError(`${completed} Teilbelege vollständig verarbeitet. ${error instanceof Error ? error.message : "Der Import wurde unterbrochen."} Bitte vor einem erneuten Upload die bereits angelegten Belege prüfen.`);
        } finally { setIsUploading(false); }
    };

    const openUpload = () => fileInputRef.current?.click();
    const isInvoiceWorkspace = activeSection === "overview" || activeSection === "invoices";

    return <div className="dashboard-page space-y-6">
        <header className="relative isolate overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-800 px-6 py-7 text-white shadow-xl shadow-indigo-950/15 sm:px-8 sm:py-8">
            <span className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10 bg-violet-400/10" /><span className="pointer-events-none absolute bottom-0 right-[18%] h-28 w-28 translate-y-1/2 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="relative"><div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-cyan-100 shadow-lg shadow-black/10"><ReceiptText className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100">Finanzen</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Eingangsrechnungen</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/65">Belege zentral erfassen, zuverlässig prüfen und alle Zahlungsfristen im Blick behalten.</p></div></div></div>
        </header>
        <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelected} />
        {pendingPdf && <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="pdf-split-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"><h2 id="pdf-split-title" className="text-2xl font-black text-slate-950">Rechnungen in der PDF aufteilen</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">Die Datei enthält {pendingPdf.pageCount} Seiten. Markiere jede Seite, auf der eine neue Rechnung beginnt. Seiten ohne Markierung gehören zur vorherigen Rechnung.</p><p className="mt-2 text-sm font-bold text-indigo-700">Seite 1 beginnt immer die erste Rechnung.</p><div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: pendingPdf.pageCount }, (_, index) => index + 1).map((page) => <button key={page} type="button" disabled={page === 1} onClick={() => setPageStarts((current) => current.includes(page) ? current.filter((value) => value !== page) : [...current, page])} className={cn("rounded-xl border px-3 py-3 text-sm font-bold", pageStarts.includes(page) ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>Seite {page}{pageStarts.includes(page) && <span className="block text-xs">Neuer Beleg</span>}</button>)}</div><p className="mt-5 text-sm font-semibold text-slate-600">{pageStarts.length} {pageStarts.length === 1 ? "Rechnung" : "Rechnungen"} werden angelegt.</p><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setPendingPdf(null)} className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600">Abbrechen</button><button type="button" onClick={() => void importPdfGroups()} className="rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white">Rechnungen importieren</button></div></section></div>}

        <div className="grid gap-6 xl:grid-cols-[15.5rem_minmax(0,1fr)]">
            <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-6"><p className="px-3 pb-3 pt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Arbeitsbereich</p><nav className="space-y-1">{sections.map(({ id, label, description, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveSection(id)} className={cn("flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all", activeSection === id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950")}><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", activeSection === id ? "bg-white/15" : "bg-indigo-50 text-indigo-600")}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-black">{label}</span><span className={cn("mt-0.5 block truncate text-xs font-medium", activeSection === id ? "text-white/65" : "text-slate-400")}>{description}</span></span></button>)}</nav></aside>
            <main className="min-w-0 space-y-5">
                {isInvoiceWorkspace && <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">{[
                    { label: "Neu eingegangen", value: counters.new, icon: UploadCloud, tone: "border-indigo-100 bg-indigo-50 text-indigo-600", activate: "new" as InvoiceFilter },
                    { label: "In Prüfung", value: counters.review, icon: FileSearch, tone: "border-violet-100 bg-violet-50 text-violet-600", activate: "review" as InvoiceFilter },
                    { label: "Heute fällig", value: counters.dueToday, icon: CalendarClock, tone: "border-rose-100 bg-rose-50 text-rose-600", activate: "all" as InvoiceFilter },
                    { label: "Skonto-Alarm", value: counters.discount, icon: CalendarClock, tone: "border-orange-100 bg-orange-50 text-orange-600", activate: "discount" as InvoiceFilter },
                    { label: "Dubletten", value: counters.duplicates, icon: CircleAlert, tone: "border-amber-100 bg-amber-50 text-amber-600", activate: "duplicate" as InvoiceFilter },
                ].map(({ label, value, icon: Icon, tone, activate }) => <button key={label} type="button" onClick={() => { setActiveSection("invoices"); setFilter(activate); }} className="group relative overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/60"><span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform group-hover:scale-110", tone)}><Icon className="h-5 w-5" /></span><span className="absolute right-5 top-5 text-lg font-black text-slate-200 transition group-hover:text-indigo-300">↗</span><p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{value === 1 ? "Rechnung" : "Rechnungen"}</p></button>)}</section>}

                {isInvoiceWorkspace && <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-5 border-b border-slate-100 px-6 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Files className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">Rechnungseingang</p><h2 className="mt-1 text-2xl font-black text-slate-950">{filter === "discount" ? "Skonto-Alarme" : "Eingegangene Rechnungen"}</h2></div></div><p className="mt-3 text-sm font-medium text-slate-500">{filteredInvoices.length} {filteredInvoices.length === 1 ? "Beleg in dieser Ansicht" : "Belege in dieser Ansicht"}</p></div><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => setIsDateFilterOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"><CalendarClock className="h-4 w-4 text-indigo-500" />{dateFilter === "all" ? "Zeitraum filtern" : dateFilter === "custom" ? "Eigener Zeitraum" : dateFilter === "today" ? "Heute" : dateFilter === "last7" ? "Letzte 7 Tage" : dateFilter === "currentMonth" ? "Dieser Monat" : new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric" }).format(new Date(`${dateFilter.slice(6)}-01T12:00:00`))}</button><button type="button" onClick={openUpload} disabled={isUploading} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{isUploading ? "Wird verarbeitet..." : "Rechnung hochladen"}</button></div></div>
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7 xl:flex-row xl:items-center xl:justify-between"><div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-slate-200">{(["all", "new", "review", "approved", "paid", "duplicate"] as InvoiceFilter[]).map((id) => <button key={id} type="button" onClick={() => { setFilter(id); setActiveSection("invoices"); }} className={cn("whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-black transition", filter === id ? "bg-slate-950 text-white shadow-lg shadow-slate-300" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>{id === "all" ? "Alle" : id === "new" ? `Neu ${counters.new || ""}` : id === "review" ? `In Prüfung ${counters.review || ""}` : id === "approved" ? "Freigegeben" : id === "paid" ? `Bezahlt ${counters.paid || ""}` : `Dubletten ${counters.duplicates || ""}`}</button>)}</div><div className="relative w-full xl:max-w-xs"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="Lieferant oder Nummer suchen..." /></div></div>
                    {filteredInvoices.length ? <div className="overflow-x-auto"><div className="min-w-[1330px]"><div className="grid grid-cols-[minmax(13rem,1.4fr)_minmax(7rem,.8fr)_6rem_6.8rem_4.2rem_7.5rem_7rem_minmax(14rem,1.2fr)_7rem_8rem] items-center gap-4 border-b border-slate-100 bg-slate-950 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-300 sm:px-7"><span>Lieferant</span><span>Rechnungs-Nr.</span><span>Datum</span><span className="text-right">Netto</span><span className="text-right">USt.</span><span className="text-right">Brutto</span><span>Fälligkeit</span><span>Kategorie</span><span className="text-center">Status</span><span className="text-right">Aktionen</span></div>{filteredInvoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} onReview={() => router.push(`/incoming-invoices/${invoice.id}`)} onPreview={() => openIncomingInvoiceDocument(invoice.id).catch((error) => setUploadError(error instanceof Error ? error.message : "Dokument konnte nicht geöffnet werden."))} onToggleFlag={() => updateIncomingInvoice(invoice.id, { isFlagged: !invoice.isFlagged }).catch((error) => setUploadError(error instanceof Error ? error.message : "Markierung konnte nicht gespeichert werden."))} />)}</div></div> : <div className="flex min-h-[22rem] flex-col items-center justify-center px-6 text-center"><span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600"><ReceiptText className="h-9 w-9" /></span><h3 className="mt-6 text-xl font-black text-slate-950">Keine Rechnungen in dieser Ansicht</h3><p className="mt-2 max-w-md font-medium text-slate-500">Laden Sie einen PDF- oder Bildbeleg hoch. Er wird geschützt abgelegt und für die Prüfung vorbereitet.</p><button type="button" onClick={openUpload} className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200">Erste Rechnung hochladen</button></div>}
                </section>}

                {activeSection === "statements" && <IncomingBankStatements invoices={incomingInvoices} onInvoicesChanged={refreshIncomingInvoices} />}
                {activeSection === "suppliers" && <EmptyWorkspace icon={Building2} eyebrow="Kontakte" title="Lieferanten zentral verwalten." text="Lieferanten werden unter Kontakte geführt und können dort angelegt, geprüft und bearbeitet werden." actionLabel="Lieferanten unter Kontakte öffnen" onAction={() => router.push("/customers?tab=suppliers")} />}
                {uploadError && <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />{uploadError}</div>}
                {isLoading && <p className="text-center text-sm font-semibold text-slate-400">Eingangsrechnungen werden geladen...</p>}
            </main>
        {isDateFilterOpen && <DateFilterDialog availableMonths={availableMonths} dateFilter={dateFilter} customDateFrom={customDateFrom} customDateTo={customDateTo} onClose={() => setIsDateFilterOpen(false)} onSelect={(next) => { setDateFilter(next); if (next !== "custom") setIsDateFilterOpen(false); }} onCustomDateChange={(from, to) => { setCustomDateFrom(from); setCustomDateTo(to); }} onApplyCustom={() => { setDateFilter("custom"); setIsDateFilterOpen(false); }} />}
        </div>
    </div>;
}

function InvoiceRow({ invoice, onReview, onPreview, onToggleFlag }: { invoice: IncomingInvoice; onReview: () => void; onPreview: () => void; onToggleFlag: () => void }) {
    const overdue = !!invoice.dueDate && invoice.dueDate < new Date().toISOString().slice(0, 10) && !["paid", "rejected"].includes(invoice.status);
    const label = invoice.isDuplicate || invoice.status === "duplicate" ? "Dublette" : statusLabel[invoice.status];
    const isRejected = ["approved", "paid"].includes(invoice.status);
    const taxRate = invoice.netAmount && invoice.taxAmount != null && Number(invoice.netAmount) > 0 ? Math.round((Number(invoice.taxAmount) / Number(invoice.netAmount)) * 100) : null;
    return <div className={cn("grid grid-cols-[minmax(13rem,1.4fr)_minmax(7rem,.8fr)_6rem_6.8rem_4.2rem_7.5rem_7rem_minmax(14rem,1.2fr)_7rem_8rem] items-center gap-4 border-b border-slate-100 px-6 py-4 transition sm:px-7", invoice.isFlagged ? "border-l-4 border-l-orange-400 bg-orange-50/70 hover:bg-orange-50" : "hover:bg-indigo-50/35")}><div className="flex min-w-0 items-center gap-3"><span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", invoice.isDuplicate ? "border-amber-100 bg-amber-50 text-amber-600" : "border-indigo-100 bg-indigo-50 text-indigo-600")}>{invoice.isDuplicate ? <CircleAlert className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</span><div className="min-w-0"><p className="truncate font-black text-slate-900">{invoice.supplierName || "Noch nicht erkannt"}</p><p className="mt-1 truncate text-xs font-semibold text-slate-400">{invoice.supplierVatNumber || invoice.originalFileName}</p></div></div><p className="truncate font-mono text-sm font-bold text-slate-700">{invoice.invoiceNumber || "–"}</p><p className="text-sm font-semibold text-slate-600">{formatDate(invoice.issueDate)}</p><p className="text-right text-sm font-bold text-slate-700">{euro(invoice.netAmount, invoice.currency)}</p><p className="text-right text-xs font-black text-slate-500">{taxRate == null ? "–" : `${taxRate} %`}</p><p className="text-right font-black text-slate-950">{euro(invoice.grossAmount, invoice.currency)}</p><p className={cn("text-sm font-bold", overdue ? "text-rose-600" : "text-slate-600")}>{overdue && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />}{formatDate(invoice.dueDate)}</p><p className="truncate text-sm font-semibold text-slate-700" title={invoice.category || "Noch nicht kategorisiert"}>{invoice.category || "Noch nicht kategorisiert"}</p><span className={cn("mx-auto w-fit rounded-full px-3 py-1.5 text-[10px] font-black ring-1", stateTone(invoice))}>{label}</span><div className="flex justify-end gap-2">{!isRejected && <button type="button" onClick={onReview} className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100" title="Rechnung prüfen"><FileSearch className="h-4 w-4" /></button>}<button type="button" onClick={onPreview} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600" title="Originalbeleg öffnen"><Eye className="h-4 w-4" /></button><button type="button" onClick={onToggleFlag} className={cn("flex h-9 w-9 items-center justify-center rounded-xl border transition", invoice.isFlagged ? "border-orange-200 bg-orange-400 text-white shadow-sm shadow-orange-200" : "border-slate-200 bg-white text-slate-400 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500")} title={invoice.isFlagged ? "Markierung entfernen" : "Für später markieren"}><Flag className={cn("h-4 w-4", invoice.isFlagged && "fill-current")} /></button></div></div>;
}

function EmptyWorkspace({ icon: Icon, eyebrow, title, text, actionLabel, onAction }: { icon: typeof ReceiptText; eyebrow: string; title: string; text: string; actionLabel?: string; onAction?: () => void }) {
    return <section className="flex min-h-[30rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-cyan-50/50 px-6 py-16 text-center"><span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-indigo-600 shadow-xl shadow-indigo-100"><Icon className="h-9 w-9" /></span><p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-indigo-500">{eyebrow}</p><h2 className="mt-3 max-w-xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2><p className="mt-3 max-w-xl font-medium leading-relaxed text-slate-500">{text}</p>{actionLabel && onAction && <button type="button" onClick={onAction} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200">{actionLabel}<ArrowRight className="h-4 w-4" /></button>}</section>;
}

function DateFilterDialog({ availableMonths, dateFilter, customDateFrom, customDateTo, onClose, onSelect, onCustomDateChange, onApplyCustom }: { availableMonths: string[]; dateFilter: DateFilter; customDateFrom: string; customDateTo: string; onClose: () => void; onSelect: (filter: DateFilter) => void; onCustomDateChange: (from: string, to: string) => void; onApplyCustom: () => void }) {
    const monthName = (month: string) => new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
    const quickFilters: Array<{ id: Exclude<DateFilter, `month:${string}` | "custom">; label: string; description: string }> = [
        { id: "all", label: "Alle Rechnungen", description: "Ohne zeitliche Einschränkung" },
        { id: "today", label: "Heute", description: "Rechnungsdatum von heute" },
        { id: "last7", label: "Letzte 7 Tage", description: "Inklusive heute" },
        { id: "currentMonth", label: "Dieser Monat", description: "Aktueller Kalendermonat" },
    ];
    return <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="incoming-invoice-date-filter-title" className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">Rechnungseingang</p><h2 id="incoming-invoice-date-filter-title" className="mt-1 text-2xl font-black text-slate-950">Zeitraum auswählen</h2><p className="mt-1 text-sm font-medium text-slate-500">Filtern Sie Rechnungen nach einem Monat oder einem frei gewählten Zeitraum.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Schließen"><X className="h-5 w-5" /></button></header><div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-7"><div><p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Schnellauswahl</p><div className="grid gap-2 sm:grid-cols-2">{quickFilters.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={cn("rounded-2xl border p-4 text-left transition", dateFilter === item.id ? "border-indigo-300 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-100" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50")}><p className="font-black">{item.label}</p><p className="mt-1 text-xs font-medium text-slate-500">{item.description}</p></button>)}</div></div><div><p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Monat auswählen</p><div className="flex flex-wrap gap-2">{availableMonths.length ? availableMonths.map((month) => <button key={month} type="button" onClick={() => onSelect(`month:${month}`)} className={cn("rounded-xl border px-3 py-2 text-sm font-black transition", dateFilter === `month:${month}` ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700")}>{monthName(month)}</button>) : <p className="text-sm font-medium text-slate-400">Sobald Rechnungen vorhanden sind, stehen Monate zur Auswahl.</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Eigener Zeitraum</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-black text-slate-700">Von<input type="date" value={customDateFrom} onChange={(event) => onCustomDateChange(event.target.value, customDateTo)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-700 outline-none focus:border-indigo-500" /></label><label className="text-sm font-black text-slate-700">Bis<input type="date" value={customDateTo} min={customDateFrom || undefined} onChange={(event) => onCustomDateChange(customDateFrom, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-700 outline-none focus:border-indigo-500" /></label></div><button type="button" onClick={onApplyCustom} disabled={!customDateFrom && !customDateTo} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Eigenen Zeitraum anwenden</button></div></div><footer className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5 sm:px-7"><button type="button" onClick={() => { onSelect("all"); onClose(); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600">Filter zurücksetzen</button><button type="button" onClick={onClose} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200">Fertig</button></footer></section></div>;
}
