"use client";

import React, { useMemo, useState } from "react";
import {
    AlertCircle,
    BarChart3,
    Calendar,
    ChevronDown,
    ChevronUp,
    Download,
    Edit2,
    Euro,
    FileText,
    Filter,
    Loader2,
    PieChart,
    ReceiptText,
    TrendingUp,
} from "lucide-react";
import { DeviationModal } from "@/components/DeviationModal";
import { useNotification } from "@/context/NotificationContext";
import { useInvoices } from "@/hooks/useInvoices";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { cn } from "@/lib/utils";
import { Invoice, InvoiceStatus } from "@/types/invoice";

type ReportFilter = "billable" | "all" | InvoiceStatus;

interface QuarterData {
    quarter: number;
    label: string;
    invoices: Invoice[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    openAmount: number;
    deviation: number;
}

const filterOptions: Array<{ value: ReportFilter; label: string; hint: string }> = [
    { value: "billable", label: "Abgerechnet", hint: "ohne Entwürfe & Storno" },
    { value: "all", label: "Alle", hint: "inkl. Entwürfe" },
    { value: "pending", label: "Offen", hint: "nicht bezahlt" },
    { value: "paid", label: "Bezahlt", hint: "erledigt" },
    { value: "overdue", label: "Überfällig", hint: "Mahnrelevant" },
    { value: "draft", label: "Entwürfe", hint: "noch nicht final" },
];

const statusLabels: Record<InvoiceStatus, string> = {
    draft: "Entwurf",
    pending: "Offen",
    paid: "Bezahlt",
    overdue: "Überfällig",
    canceled: "Storniert",
};

const statusStyles: Record<InvoiceStatus, string> = {
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
    overdue: "bg-rose-50 text-rose-700 border-rose-100",
    canceled: "bg-slate-100 text-slate-400 border-slate-200",
};

const quarterLabels = ["Jänner - März", "April - Juni", "Juli - September", "Oktober - Dezember"];

function getQuarter(date: string) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 1;
    return Math.floor(parsed.getMonth() / 3) + 1;
}

function formatCurrency(value: number) {
    return `€ ${value.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date?: string) {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("de-AT");
}

function getPaidAmount(invoice: Invoice) {
    if (typeof invoice.paidAmount === "number") return invoice.paidAmount;
    return invoice.status === "paid" ? invoice.totalAmount : 0;
}

function getDeviation(invoice: Invoice) {
    if (typeof invoice.paidAmount !== "number" && invoice.status !== "paid") return 0;
    return getPaidAmount(invoice) - invoice.totalAmount;
}

export default function ReportsPage() {
    usePermissionGuard("reports_read");

    const { invoices, updateInvoice, isLoading } = useInvoices();
    const { showToast } = useNotification();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [filter, setFilter] = useState<ReportFilter>("billable");
    const [expandedQuarters, setExpandedQuarters] = useState<string[]>([]);
    const [deviationModalInvoice, setDeviationModalInvoice] = useState<Invoice | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        invoices.forEach((invoice) => {
            const year = new Date(invoice.issueDate).getFullYear();
            if (!Number.isNaN(year)) years.add(year);
        });
        years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices
            .filter((invoice) => {
                const year = new Date(invoice.issueDate).getFullYear();
                if (year !== selectedYear) return false;
                if (filter === "all") return true;
                if (filter === "billable") return invoice.status !== "draft" && invoice.status !== "canceled";
                return invoice.status === filter;
            })
            .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [invoices, selectedYear, filter]);

    const quarterlyData = useMemo(() => {
        const quarters: QuarterData[] = [1, 2, 3, 4].map((quarter) => ({
            quarter,
            label: quarterLabels[quarter - 1],
            invoices: [],
            subtotal: 0,
            taxAmount: 0,
            totalAmount: 0,
            paidAmount: 0,
            openAmount: 0,
            deviation: 0,
        }));

        filteredInvoices.forEach((invoice) => {
            const quarter = getQuarter(invoice.issueDate);
            const data = quarters[quarter - 1];
            const paidAmount = getPaidAmount(invoice);
            const openAmount = Math.max(invoice.totalAmount - paidAmount, 0);

            data.invoices.push(invoice);
            data.subtotal += invoice.subtotal;
            data.taxAmount += invoice.taxAmount;
            data.totalAmount += invoice.totalAmount;
            data.paidAmount += paidAmount;
            data.openAmount += openAmount;
            data.deviation += getDeviation(invoice);
        });

        return quarters;
    }, [filteredInvoices]);

    const yearTotal = useMemo(() => {
        return quarterlyData.reduce(
            (acc, quarter) => ({
                subtotal: acc.subtotal + quarter.subtotal,
                taxAmount: acc.taxAmount + quarter.taxAmount,
                totalAmount: acc.totalAmount + quarter.totalAmount,
                paidAmount: acc.paidAmount + quarter.paidAmount,
                openAmount: acc.openAmount + quarter.openAmount,
                deviation: acc.deviation + quarter.deviation,
            }),
            { subtotal: 0, taxAmount: 0, totalAmount: 0, paidAmount: 0, openAmount: 0, deviation: 0 },
        );
    }, [quarterlyData]);

    const customerCount = useMemo(() => {
        return new Set(filteredInvoices.map((invoice) => invoice.customerId || invoice.customerName)).size;
    }, [filteredInvoices]);

    const selectedFilter = filterOptions.find((option) => option.value === filter) || filterOptions[0];

    const toggleQuarter = (quarterId: string) => {
        setExpandedQuarters((prev) =>
            prev.includes(quarterId)
                ? prev.filter((quarter) => quarter !== quarterId)
                : [...prev, quarterId],
        );
    };

    const handleSaveDeviation = (updatedInvoice: Invoice) => {
        updateInvoice(updatedInvoice.id, updatedInvoice);
        showToast("Zahlungsabweichung wurde gespeichert.", "success");
    };

    const exportPdf = async () => {
        try {
            setIsExporting(true);
            const { jsPDF } = await import("jspdf");
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 14;
            let y = 16;

            const addFooter = () => {
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`FlowY Auswertung | ${new Date().toLocaleDateString("de-AT")}`, margin, pageHeight - 8);
                doc.text(`Seite ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: "right" });
            };

            const ensureSpace = (height: number) => {
                if (y + height <= pageHeight - 18) return;
                addFooter();
                doc.addPage();
                y = 16;
            };

            doc.setFillColor(79, 70, 229);
            doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 4, 4, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(17);
            doc.text(`Finanz-Auswertung ${selectedYear}`, margin + 6, y + 10);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`${selectedFilter.label} | ${filteredInvoices.length} Rechnungen | ${customerCount} Kunden`, margin + 6, y + 18);
            y += 35;

            const cards = [
                ["Netto", yearTotal.subtotal],
                ["Steuer", yearTotal.taxAmount],
                ["Brutto", yearTotal.totalAmount],
                ["Bezahlt", yearTotal.paidAmount],
                ["Offen", yearTotal.openAmount],
                ["Abweichung", yearTotal.deviation],
            ];
            const cardWidth = (pageWidth - margin * 2 - 5) / 3;
            cards.forEach(([label, amount], index) => {
                const col = index % 3;
                const row = Math.floor(index / 3);
                const x = margin + col * (cardWidth + 2.5);
                const cardY = y + row * 22;
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(x, cardY, cardWidth, 17, 3, 3, "FD");
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.setFont("helvetica", "bold");
                doc.text(String(label).toUpperCase(), x + 3, cardY + 5);
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.text(formatCurrency(Number(amount)), x + 3, cardY + 12);
            });
            y += 50;

            quarterlyData.forEach((quarter) => {
                ensureSpace(26);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(15, 23, 42);
                doc.text(`Q${quarter.quarter} - ${quarter.label}`, margin, y);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(`${quarter.invoices.length} Rechnungen`, margin, y + 5);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
                doc.text(formatCurrency(quarter.totalAmount), pageWidth - margin, y, { align: "right" });
                doc.setFont("helvetica", "normal");
                doc.setTextColor(16, 185, 129);
                doc.text(`Bezahlt: ${formatCurrency(quarter.paidAmount)}`, pageWidth - margin, y + 5, { align: "right" });
                y += 11;

                doc.setFillColor(15, 23, 42);
                doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.text("Nr.", margin + 2, y + 4.7);
                doc.text("Kunde", margin + 28, y + 4.7);
                doc.text("Status", margin + 92, y + 4.7);
                doc.text("Datum", margin + 116, y + 4.7);
                doc.text("Brutto", pageWidth - 48, y + 4.7, { align: "right" });
                doc.text("Offen", pageWidth - margin - 2, y + 4.7, { align: "right" });
                y += 8;

                if (quarter.invoices.length === 0) {
                    doc.setTextColor(148, 163, 184);
                    doc.setFont("helvetica", "normal");
                    doc.text("Keine Rechnungen in diesem Quartal.", margin + 2, y + 5);
                    y += 12;
                    return;
                }

                quarter.invoices.forEach((invoice) => {
                    ensureSpace(9);
                    const paidAmount = getPaidAmount(invoice);
                    const openAmount = Math.max(invoice.totalAmount - paidAmount, 0);
                    doc.setFontSize(7.5);
                    doc.setTextColor(15, 23, 42);
                    doc.setFont("helvetica", "bold");
                    doc.text(invoice.invoiceNumber || "-", margin + 2, y + 5);
                    doc.setFont("helvetica", "normal");
                    const customer = doc.splitTextToSize(invoice.customerName || "-", 58)[0];
                    doc.text(customer, margin + 28, y + 5);
                    doc.text(statusLabels[invoice.status] || invoice.status, margin + 92, y + 5);
                    doc.text(formatDate(invoice.issueDate), margin + 116, y + 5);
                    doc.text(formatCurrency(invoice.totalAmount), pageWidth - 48, y + 5, { align: "right" });
                    doc.text(formatCurrency(openAmount), pageWidth - margin - 2, y + 5, { align: "right" });
                    doc.setDrawColor(226, 232, 240);
                    doc.line(margin, y + 8, pageWidth - margin, y + 8);
                    y += 9;
                });
                y += 5;
            });

            addFooter();
            doc.save(`Auswertung_${selectedYear}_${selectedFilter.label.replace(/\s+/g, "_")}.pdf`);
            showToast("PDF-Auswertung wurde erstellt.", "success");
        } catch (error) {
            console.error("Report PDF export failed", error);
            showToast("PDF-Auswertung konnte nicht erstellt werden.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="flex items-center gap-3 rounded-3xl bg-white px-6 py-4 text-sm font-black text-slate-500 shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    Auswertungen werden geladen...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <section className="overflow-hidden rounded-[34px] border border-indigo-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-500 p-6 text-white shadow-2xl shadow-indigo-200/60 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-100">
                            <BarChart3 className="h-4 w-4" />
                            Auswertungen
                        </div>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Finanzberichte</h1>
                        <p className="mt-3 max-w-2xl text-base font-semibold text-indigo-100 sm:text-lg">
                            Übersichtliche Jahres- und Quartalsauswertung mit offenen Beträgen, Zahlungsabweichungen und PDF-Export.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                        <HeroMetric label="Rechnungen" value={filteredInvoices.length.toString()} />
                        <HeroMetric label="Kunden" value={customerCount.toString()} />
                        <HeroMetric label="Offen" value={formatCurrency(yearTotal.openAmount)} highlight />
                    </div>
                </div>
            </section>

            <section className="grid gap-4 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center lg:p-5">
                <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                    <label className="space-y-2">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                            Jahr
                        </span>
                        <select
                            value={selectedYear}
                            onChange={(event) => setSelectedYear(parseInt(event.target.value, 10))}
                            className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                            {availableYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </label>

                    <div className="space-y-2">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <Filter className="h-3.5 w-3.5" />
                            Ausgabe
                        </span>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                            {filterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setFilter(option.value)}
                                    className={cn(
                                        "rounded-2xl border px-4 py-3 text-left transition-all",
                                        filter === option.value
                                            ? "border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-200 hover:bg-white",
                                    )}
                                >
                                    <p className="text-sm font-black">{option.label}</p>
                                    <p className={cn("mt-0.5 text-[10px] font-bold", filter === option.value ? "text-indigo-100" : "text-slate-400")}>{option.hint}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={exportPdf}
                    disabled={isExporting}
                    className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-6 text-sm font-black text-white shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export in PDF
                </button>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <SummaryCard icon={Euro} label="Netto" value={formatCurrency(yearTotal.subtotal)} />
                <SummaryCard icon={ReceiptText} label="Steuer" value={formatCurrency(yearTotal.taxAmount)} />
                <SummaryCard icon={TrendingUp} label="Brutto" value={formatCurrency(yearTotal.totalAmount)} strong />
                <SummaryCard icon={PieChart} label="Bezahlt" value={formatCurrency(yearTotal.paidAmount)} tone="green" />
                <SummaryCard icon={AlertCircle} label="Offen" value={formatCurrency(yearTotal.openAmount)} tone="amber" />
                <SummaryCard icon={FileText} label="Abweichung" value={formatCurrency(yearTotal.deviation)} tone={yearTotal.deviation < 0 ? "red" : "green"} />
            </section>

            <section className="grid gap-5 xl:grid-cols-4">
                {quarterlyData.map((quarter) => {
                    const percent = yearTotal.totalAmount > 0 ? Math.round((quarter.totalAmount / yearTotal.totalAmount) * 100) : 0;
                    return (
                        <div key={quarter.quarter} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">Q{quarter.quarter}</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-950">{quarter.label}</h3>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{percent}%</span>
                            </div>
                            <div className="space-y-3">
                                <MetricLine label="Brutto" value={formatCurrency(quarter.totalAmount)} />
                                <MetricLine label="Bezahlt" value={formatCurrency(quarter.paidAmount)} tone="text-emerald-600" />
                                <MetricLine label="Offen" value={formatCurrency(quarter.openAmount)} tone="text-amber-600" />
                            </div>
                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${Math.min(percent, 100)}%` }} />
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className="space-y-4">
                {quarterlyData.map((quarter) => {
                    const quarterId = `Q${quarter.quarter}`;
                    const isExpanded = expandedQuarters.includes(quarterId);

                    return (
                        <article key={quarterId} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleQuarter(quarterId)}
                                className="flex w-full flex-col gap-5 p-5 text-left transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between lg:p-6"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">Quartal {quarter.quarter}</p>
                                        <h2 className="text-xl font-black text-slate-950">{quarter.label}</h2>
                                        <p className="text-sm font-semibold text-slate-500">{quarter.invoices.length} Rechnung{quarter.invoices.length === 1 ? "" : "en"}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                                    <HeaderAmount label="Brutto" value={quarter.totalAmount} />
                                    <HeaderAmount label="Bezahlt" value={quarter.paidAmount} className="text-emerald-600" />
                                    <HeaderAmount label="Offen" value={quarter.openAmount} className="text-amber-600" />
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </div>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/60 p-4 lg:p-5">
                                    {quarter.invoices.length === 0 ? (
                                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                                            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                                            <p className="font-black text-slate-700">Keine Rechnungen in diesem Quartal</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-400">Die aktuelle Auswahl liefert hier keine Einträge.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                                            <div className="hidden grid-cols-[1fr_1.35fr_0.75fr_0.9fr_0.9fr_0.9fr_auto] gap-4 border-b border-slate-100 bg-slate-950 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white xl:grid">
                                                <span>Rechnung</span>
                                                <span>Kunde</span>
                                                <span>Status</span>
                                                <span className="text-right">Brutto</span>
                                                <span className="text-right">Bezahlt</span>
                                                <span className="text-right">Offen</span>
                                                <span className="text-center">Aktion</span>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {quarter.invoices.map((invoice) => {
                                                    const paidAmount = getPaidAmount(invoice);
                                                    const openAmount = Math.max(invoice.totalAmount - paidAmount, 0);
                                                    const deviation = getDeviation(invoice);
                                                    return (
                                                        <div key={invoice.id} className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1fr_1.35fr_0.75fr_0.9fr_0.9fr_0.9fr_auto] xl:items-center">
                                                            <div>
                                                                <p className="font-black text-slate-950">#{invoice.invoiceNumber}</p>
                                                                <p className="text-xs font-bold text-slate-400">{formatDate(invoice.issueDate)}</p>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate font-black text-slate-800">{invoice.customerName}</p>
                                                                <p className="truncate text-xs font-semibold text-slate-400">{invoice.constructionProject || invoice.subjectExtra || "Kein Betreff hinterlegt"}</p>
                                                            </div>
                                                            <div>
                                                                <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-black", statusStyles[invoice.status])}>
                                                                    {statusLabels[invoice.status]}
                                                                </span>
                                                            </div>
                                                            <AmountCell value={invoice.totalAmount} />
                                                            <AmountCell value={paidAmount} className="text-emerald-600" />
                                                            <AmountCell value={openAmount} className={openAmount > 0 ? "text-amber-600" : "text-slate-400"} />
                                                            <div className="flex items-center justify-between gap-3 xl:justify-center">
                                                                {Math.abs(deviation) > 0.01 && (
                                                                    <span className={cn("text-xs font-black", deviation < 0 ? "text-rose-600" : "text-emerald-600")}>
                                                                        {deviation > 0 ? "+" : ""}{formatCurrency(deviation)}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeviationModalInvoice(invoice)}
                                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                    Zahlung
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}
            </section>

            <DeviationModal
                isOpen={!!deviationModalInvoice}
                onClose={() => setDeviationModalInvoice(null)}
                onSave={handleSaveDeviation}
                invoice={deviationModalInvoice}
            />
        </div>
    );
}

function HeroMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100">{label}</p>
            <p className={cn("mt-2 text-2xl font-black tabular-nums", highlight ? "text-cyan-100" : "text-white")}>{value}</p>
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    strong = false,
    tone = "slate",
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    strong?: boolean;
    tone?: "slate" | "green" | "amber" | "red";
}) {
    const tones = {
        slate: "bg-slate-50 text-slate-600",
        green: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        red: "bg-rose-50 text-rose-600",
    };

    return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", tones[tone])}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className={cn("mt-2 text-2xl font-black tabular-nums tracking-tight", strong ? "text-slate-950" : "text-slate-700")}>{value}</p>
        </div>
    );
}

function MetricLine({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-400">{label}</span>
            <span className={cn("font-black tabular-nums", tone)}>{value}</span>
        </div>
    );
}

function HeaderAmount({ label, value, className }: { label: string; value: number; className?: string }) {
    return (
        <div className="min-w-[130px] text-left lg:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={cn("text-lg font-black tabular-nums text-slate-950", className)}>{formatCurrency(value)}</p>
        </div>
    );
}

function AmountCell({ value, className }: { value: number; className?: string }) {
    return (
        <div className={cn("text-sm font-black tabular-nums text-slate-900 xl:text-right", className)}>
            {formatCurrency(value)}
        </div>
    );
}
