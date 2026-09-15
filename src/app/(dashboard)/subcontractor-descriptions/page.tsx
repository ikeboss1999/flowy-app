"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Calendar, CheckCircle2, Download, Edit2, Eye, FileText, PlusCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSubcontractorDescriptions } from "@/hooks/useSubcontractorDescriptions";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { SubcontractorDescription } from "@/types/subcontractor-description";
import { cn } from "@/lib/utils";

const PdfViewer = dynamic(async () => {
    const [{ PDFViewer }, { SubcontractorDescriptionReactPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/SubcontractorDescriptionReactPDF"),
    ]);
    return function DescriptionPdfViewer({ description, company }: any) {
        return <PDFViewer width="100%" height="100%" style={{ border: 0 }}><SubcontractorDescriptionReactPDF description={description} company={company} /></PDFViewer>;
    };
}, { ssr: false });

export default function SubcontractorDescriptionsPage() {
    const router = useRouter();
    const { descriptions, isLoading } = useSubcontractorDescriptions();
    const { data: company } = useCompanySettings();
    const [query, setQuery] = React.useState("");
    const [selected, setSelected] = React.useState<SubcontractorDescription | null>(null);
    const filtered = descriptions.filter((entry) => [entry.documentNumber, entry.subcontractorName, entry.customerName, entry.constructionProject].join(" ").toLowerCase().includes(query.toLowerCase()));

    const download = async (entry: SubcontractorDescription) => {
        const { pdf } = await import("@react-pdf/renderer");
        const { SubcontractorDescriptionReactPDF } = await import("@/components/SubcontractorDescriptionReactPDF");
        const blob = await pdf(React.createElement(SubcontractorDescriptionReactPDF, { description: entry, company }) as any).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${entry.documentNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) return <div className="dashboard-page font-bold text-slate-400">Laden …</div>;

    return (
        <div className="dashboard-page space-y-6">
            <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl sm:p-8">
                <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                    <div><div className="mb-4 flex items-center gap-3 text-cyan-200"><div className="rounded-2xl border border-white/10 bg-white/10 p-3"><FileText className="h-6 w-6" /></div><span className="text-xs font-black uppercase tracking-[0.35em]">Finanzen</span></div><h1 className="text-4xl font-black sm:text-5xl">Leistungsbeschreibungen</h1><p className="mt-3 font-semibold text-white/70">Dokumente aus angenommenen Angeboten für Subunternehmer.</p></div>
                    <button onClick={() => router.push("/offers")} className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-indigo-700"><PlusCircle className="h-5 w-5" /> Aus Angebot erstellen</button>
                </div>
            </div>
            <div className="dashboard-stat-grid"><div className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><span className="text-xs font-bold uppercase tracking-widest text-slate-400">Gesamt</span><span className="rounded-2xl bg-indigo-50 px-4 py-2 text-3xl font-black text-indigo-600">{descriptions.length}</span></div><div className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><span className="text-xs font-bold uppercase tracking-widest text-slate-400">Gespeichert</span><CheckCircle2 className="text-emerald-600" /></div></div>
            <div className="dashboard-toolbar"><div className="group relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dokument, Subunternehmer oder Projekt suchen …" className="w-full rounded-2xl border border-slate-100 bg-white py-3.5 pl-12 pr-4 font-medium outline-none shadow-sm focus:border-indigo-500" /></div></div>
            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
                <div className="hidden grid-cols-[1.2fr_1.5fr_1.2fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400 lg:grid"><span>Dokument</span><span>Subunternehmer</span><span>Projekt</span><span>Status</span><span>Aktionen</span></div>
                {filtered.length === 0 ? <div className="p-16 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 font-black text-slate-700">Noch keine Leistungsbeschreibungen vorhanden</p></div> : filtered.map((entry) => <div key={entry.id} className="grid gap-4 border-b border-slate-100 px-6 py-5 last:border-0 lg:grid-cols-[1.2fr_1.5fr_1.2fr_1fr_auto] lg:items-center"><div><p className="font-black text-slate-950">{entry.documentNumber}</p><p className="flex items-center gap-1 text-xs font-semibold text-slate-400"><Calendar className="h-3 w-3" />{new Date(entry.issueDate).toLocaleDateString("de-DE")}</p></div><p className="font-bold text-slate-700">{entry.subcontractorName || "-"}</p><p className="font-semibold text-slate-600">{entry.constructionProject || "-"}</p><span className={cn("w-fit rounded-full px-3 py-1 text-xs font-black", entry.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700")}>{entry.status === "draft" ? "Entwurf" : entry.status}</span><div className="flex gap-2"><button onClick={() => setSelected(entry)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100" title="Vorschau öffnen"><Eye className="h-4 w-4" /> Vorschau</button>{entry.status === "draft" && <button onClick={() => router.push(`/subcontractor-descriptions/${encodeURIComponent(entry.id)}/edit`)} className="rounded-xl bg-amber-50 p-2 text-amber-600 transition hover:bg-amber-100" title="Entwurf bearbeiten" aria-label="Entwurf bearbeiten"><Edit2 className="h-4 w-4" /></button>}<button onClick={() => void download(entry)} className="rounded-xl bg-slate-100 p-2 text-slate-600" title="PDF herunterladen" aria-label="PDF herunterladen"><Download className="h-4 w-4" /></button></div></div>)}
            </div>
            {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><p className="font-black">{selected.documentNumber}</p><p className="text-sm text-slate-500">{selected.subcontractorName}</p></div><button onClick={() => setSelected(null)} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">Schließen</button></div><div className="min-h-0 flex-1 bg-slate-200"><PdfViewer description={selected} company={company} /></div></div></div>}
        </div>
    );
}
