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
    Loader2,
    PieChart,
    ReceiptText,
    TrendingUp,
    User,
} from "lucide-react";
import { DeviationModal } from "@/components/DeviationModal";
import { useNotification } from "@/context/NotificationContext";
import { useInvoices } from "@/hooks/useInvoices";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { cn } from "@/lib/utils";
import { Invoice, InvoiceStatus } from "@/types/invoice";

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
    const [activeView, setActiveView] = useState<"details" | "chart" | "open">("details");
    const [openCustomerFilter, setOpenCustomerFilter] = useState("all");
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
                return invoice.status !== "draft" && invoice.status !== "canceled";
            })
            .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [invoices, selectedYear]);

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

    const comparisonData = useMemo(() => {
        const build = (year: number) => {
            const data = [1, 2, 3, 4].map((quarter) => ({ quarter, total: 0, paid: 0, open: 0, count: 0 }));
            invoices.forEach((invoice) => {
                const invoiceYear = new Date(invoice.issueDate).getFullYear();
                if (invoiceYear !== year || invoice.status === "draft" || invoice.status === "canceled") return;
                const target = data[getQuarter(invoice.issueDate) - 1];
                const paid = getPaidAmount(invoice);
                target.total += invoice.totalAmount;
                target.paid += paid;
                target.open += Math.max(invoice.totalAmount - paid, 0);
                target.count += 1;
            });
            return data;
        };

        return {
            current: build(selectedYear),
            previous: build(selectedYear - 1),
        };
    }, [invoices, selectedYear]);

    const maxChartValue = useMemo(() => {
        const values = [...comparisonData.current, ...comparisonData.previous].map(item => item.total);
        return Math.max(...values, 1);
    }, [comparisonData]);

    const openReceivables = useMemo(() => {
        return filteredInvoices
            .map((invoice) => {
                const paidAmount = getPaidAmount(invoice);
                const openAmount = Math.max(invoice.totalAmount - paidAmount, 0);
                return { invoice, paidAmount, openAmount };
            })
            .filter((item) => item.openAmount > 0.01)
            .sort((a, b) => {
                if (b.openAmount !== a.openAmount) return b.openAmount - a.openAmount;
                return new Date(a.invoice.issueDate).getTime() - new Date(b.invoice.issueDate).getTime();
            });
    }, [filteredInvoices]);

    const openCustomerOptions = useMemo(() => {
        const customers = new Map<string, { id: string; name: string; amount: number; count: number }>();
        openReceivables.forEach(({ invoice, openAmount }) => {
            const id = invoice.customerId || invoice.customerName || "unknown";
            const current = customers.get(id) || {
                id,
                name: invoice.customerName || "Unbekannter Kunde",
                amount: 0,
                count: 0,
            };
            current.amount += openAmount;
            current.count += 1;
            customers.set(id, current);
        });

        return Array.from(customers.values()).sort((a, b) => b.amount - a.amount);
    }, [openReceivables]);

    const selectedOpenReceivables = useMemo(() => {
        if (openCustomerFilter === "all") return openReceivables;
        return openReceivables.filter(({ invoice }) => (invoice.customerId || invoice.customerName || "unknown") === openCustomerFilter);
    }, [openCustomerFilter, openReceivables]);

    const openReceivablesTotal = useMemo(() => {
        return selectedOpenReceivables.reduce(
            (acc, item) => ({
                gross: acc.gross + item.invoice.totalAmount,
                paid: acc.paid + item.paidAmount,
                open: acc.open + item.openAmount,
            }),
            { gross: 0, paid: 0, open: 0 },
        );
    }, [selectedOpenReceivables]);

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

            if (activeView === "open") {
                const selectedCustomer = openCustomerOptions.find((customer) => customer.id === openCustomerFilter);
                const filterLabel = openCustomerFilter === "all" ? "Alle Kunden" : selectedCustomer?.name || "Ausgewählter Kunde";

                doc.setFillColor(15, 23, 42);
                doc.roundedRect(margin, y, pageWidth - margin * 2, 27, 4, 4, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(17);
                doc.text(`Offene Posten ${selectedYear}`, margin + 6, y + 10);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text(`${filterLabel} | ${selectedOpenReceivables.length} Rechnung${selectedOpenReceivables.length === 1 ? "" : "en"}`, margin + 6, y + 18);
                y += 37;

                const cards = [
                    ["Brutto gesamt", openReceivablesTotal.gross],
                    ["Bereits bezahlt", openReceivablesTotal.paid],
                    ["Offen", openReceivablesTotal.open],
                ];
                const cardWidth = (pageWidth - margin * 2 - 5) / 3;
                cards.forEach(([label, amount], index) => {
                    const x = margin + index * (cardWidth + 2.5);
                    doc.setFillColor(248, 250, 252);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(x, y, cardWidth, 18, 3, 3, "FD");
                    doc.setFontSize(7);
                    doc.setTextColor(100, 116, 139);
                    doc.setFont("helvetica", "bold");
                    doc.text(String(label).toUpperCase(), x + 3, y + 5.5);
                    doc.setFontSize(11);
                    doc.setTextColor(15, 23, 42);
                    doc.text(formatCurrency(Number(amount)), x + 3, y + 13);
                });
                y += 30;

                if (selectedOpenReceivables.length === 0) {
                    doc.setTextColor(100, 116, 139);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.text("Keine offenen Posten für die aktuelle Auswahl.", margin, y);
                    addFooter();
                    doc.save(`Offene_Posten_${selectedYear}_${filterLabel.replace(/[^a-zA-Z0-9-]+/g, "_")}.pdf`);
                    showToast("PDF für offene Posten wurde erstellt.", "success");
                    return;
                }

                doc.setFillColor(15, 23, 42);
                doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.text("Nr.", margin + 2, y + 4.7);
                doc.text("Kunde", margin + 28, y + 4.7);
                doc.text("Datum", margin + 92, y + 4.7);
                doc.text("Status", margin + 116, y + 4.7);
                doc.text("Brutto", pageWidth - 63, y + 4.7, { align: "right" });
                doc.text("Bezahlt", pageWidth - 38, y + 4.7, { align: "right" });
                doc.text("Offen", pageWidth - margin - 2, y + 4.7, { align: "right" });
                y += 8;

                selectedOpenReceivables.forEach(({ invoice, paidAmount, openAmount }) => {
                    ensureSpace(10);
                    doc.setFontSize(7.5);
                    doc.setTextColor(15, 23, 42);
                    doc.setFont("helvetica", "bold");
                    doc.text(invoice.invoiceNumber || "-", margin + 2, y + 5);
                    doc.setFont("helvetica", "normal");
                    const customer = doc.splitTextToSize(invoice.customerName || "-", 58)[0];
                    doc.text(customer, margin + 28, y + 5);
                    doc.text(formatDate(invoice.issueDate), margin + 92, y + 5);
                    doc.text(statusLabels[invoice.status] || invoice.status, margin + 116, y + 5);
                    doc.text(formatCurrency(invoice.totalAmount), pageWidth - 63, y + 5, { align: "right" });
                    doc.text(formatCurrency(paidAmount), pageWidth - 38, y + 5, { align: "right" });
                    doc.setFont("helvetica", "bold");
                    doc.text(formatCurrency(openAmount), pageWidth - margin - 2, y + 5, { align: "right" });
                    doc.setDrawColor(226, 232, 240);
                    doc.line(margin, y + 8, pageWidth - margin, y + 8);
                    y += 9;
                });

                if (openCustomerFilter === "all" && openCustomerOptions.length > 0) {
                    y += 8;
                    ensureSpace(16);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(12);
                    doc.setTextColor(15, 23, 42);
                    doc.text("Zusammenfassung nach Kunden", margin, y);
                    y += 8;

                    openCustomerOptions.forEach((customer) => {
                        ensureSpace(8);
                        doc.setFontSize(8);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(15, 23, 42);
                        doc.text(doc.splitTextToSize(customer.name, 120)[0], margin + 2, y + 4.5);
                        doc.setTextColor(100, 116, 139);
                        doc.text(`${customer.count} offene Rechnung${customer.count === 1 ? "" : "en"}`, margin + 92, y + 4.5);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(180, 83, 9);
                        doc.text(formatCurrency(customer.amount), pageWidth - margin - 2, y + 4.5, { align: "right" });
                        doc.setDrawColor(226, 232, 240);
                        doc.line(margin, y + 7, pageWidth - margin, y + 7);
                        y += 8;
                    });
                }

                addFooter();
                doc.save(`Offene_Posten_${selectedYear}_${filterLabel.replace(/[^a-zA-Z0-9-]+/g, "_")}.pdf`);
                showToast("PDF für offene Posten wurde erstellt.", "success");
                return;
            }

            doc.setFillColor(79, 70, 229);
            doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 4, 4, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(17);
            doc.text(`Finanz-Auswertung ${selectedYear}`, margin + 6, y + 10);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Abgerechnet | ${filteredInvoices.length} Rechnungen | ${customerCount} Kunden`, margin + 6, y + 18);
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
            doc.save(`Auswertung_${selectedYear}.pdf`);
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
            <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 lg:p-8">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-20 left-1/2 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-3 text-cyan-200">
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.35em]">Auswertungen</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Finanzberichte</h1>
                        <p className="mt-3 max-w-2xl text-base font-semibold text-white/70 sm:text-lg">
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

            <section className="grid gap-4 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[260px_auto] lg:items-end lg:justify-between lg:p-5">
                <div>
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

            <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-5 grid gap-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-3">
                    <button
                        type="button"
                        onClick={() => setActiveView("details")}
                        className={cn("rounded-xl px-4 py-3 text-sm font-black transition", activeView === "details" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                    >
                        Quartalsliste
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView("chart")}
                        className={cn("rounded-xl px-4 py-3 text-sm font-black transition", activeView === "chart" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                    >
                        Diagramm & Vorjahr
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView("open")}
                        className={cn("rounded-xl px-4 py-3 text-sm font-black transition", activeView === "open" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                    >
                        Offene Posten
                    </button>
                </div>

                {activeView === "chart" && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Jahresvergleich</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedYear} gegen {selectedYear - 1}</h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">Brutto-Umsatz pro Quartal, damit Trends sofort sichtbar werden.</p>
                        </div>
                        <div className="grid gap-5 xl:grid-cols-4">
                            {comparisonData.current.map((item, index) => {
                                const previous = comparisonData.previous[index];
                                const diff = item.total - previous.total;
                                return (
                                    <div key={item.quarter} className="rounded-[28px] border border-slate-100 bg-slate-50 p-5">
                                        <div className="mb-5 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quartal</p>
                                                <h3 className="text-2xl font-black text-slate-950">Q{item.quarter}</h3>
                                            </div>
                                            <span className={cn("rounded-full px-3 py-1 text-xs font-black", diff >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                                                {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                                            </span>
                                        </div>
                                        <div className="flex h-44 items-end gap-4">
                                            <ChartBar label={String(selectedYear - 1)} value={previous.total} max={maxChartValue} muted />
                                            <ChartBar label={String(selectedYear)} value={item.total} max={maxChartValue} />
                                        </div>
                                        <div className="mt-5 space-y-2">
                                            <MetricLine label="Aktuell" value={formatCurrency(item.total)} />
                                            <MetricLine label="Vorjahr" value={formatCurrency(previous.total)} tone="text-slate-500" />
                                            <MetricLine label="Offen" value={formatCurrency(item.open)} tone="text-amber-600" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeView === "open" && (
                    <div className="space-y-5">
                        <div className="grid gap-4 xl:grid-cols-[1fr_320px] xl:items-end">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-500">Offene Posten</p>
                                <h2 className="mt-1 text-2xl font-black text-slate-950">Forderungen nach Kunde</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Alle nicht vollständig bezahlten Rechnungen im Jahr {selectedYear}, optional nach Kunde gefiltert.
                                </p>
                            </div>
                            <label className="space-y-2">
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <User className="h-3.5 w-3.5" />
                                    Kunde filtern
                                </span>
                                <select
                                    value={openCustomerFilter}
                                    onChange={(event) => setOpenCustomerFilter(event.target.value)}
                                    className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                >
                                    <option value="all">Alle Kunden</option>
                                    {openCustomerOptions.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name} ({customer.count}) - {formatCurrency(customer.amount)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard icon={ReceiptText} label="Brutto gesamt" value={formatCurrency(openReceivablesTotal.gross)} />
                            <SummaryCard icon={Euro} label="Bereits bezahlt" value={formatCurrency(openReceivablesTotal.paid)} tone="green" />
                            <SummaryCard icon={AlertCircle} label="Offen" value={formatCurrency(openReceivablesTotal.open)} tone="amber" strong />
                        </div>

                        {selectedOpenReceivables.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                <p className="font-black text-slate-800">Keine offenen Posten gefunden</p>
                                <p className="mt-1 text-sm font-semibold text-slate-400">Für die aktuelle Auswahl ist alles bezahlt.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                                <div className="hidden grid-cols-[1fr_1.35fr_0.75fr_0.85fr_0.85fr_0.85fr] gap-4 border-b border-slate-100 bg-slate-950 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white xl:grid">
                                    <span>Rechnung</span>
                                    <span>Kunde</span>
                                    <span>Status</span>
                                    <span className="text-right">Brutto</span>
                                    <span className="text-right">Bezahlt</span>
                                    <span className="text-right">Offen</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {selectedOpenReceivables.map(({ invoice, paidAmount, openAmount }) => (
                                        <div key={invoice.id} className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 xl:grid-cols-[1fr_1.35fr_0.75fr_0.85fr_0.85fr_0.85fr] xl:items-center">
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
                                            <AmountCell value={openAmount} className="text-amber-600" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {openCustomerFilter === "all" && openCustomerOptions.length > 0 && (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {openCustomerOptions.map((customer) => (
                                    <div key={customer.id} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
                                        <div className="min-w-0">
                                            <p className="truncate font-black text-slate-900">{customer.name}</p>
                                            <p className="text-xs font-bold text-slate-400">{customer.count} offene Rechnung{customer.count === 1 ? "" : "en"}</p>
                                        </div>
                                        <p className="shrink-0 text-lg font-black tabular-nums text-amber-600">{formatCurrency(customer.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {activeView === "details" && (
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
            )}

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

function ChartBar({ label, value, max, muted = false }: { label: string; value: number; max: number; muted?: boolean }) {
    const height = Math.max(8, Math.round((value / max) * 100));

    return (
        <div className="flex flex-1 flex-col items-center justify-end gap-3 self-stretch">
            <div className="flex h-full w-full items-end justify-center rounded-2xl bg-white p-2">
                <div
                    className={cn(
                        "w-full rounded-xl transition-all",
                        muted ? "bg-slate-300" : "bg-gradient-to-t from-indigo-600 to-fuchsia-500"
                    )}
                    style={{ height: `${height}%` }}
                />
            </div>
            <div className="text-center">
                <p className="text-xs font-black text-slate-500">{label}</p>
                <p className="text-[10px] font-bold text-slate-400">{formatCurrency(value)}</p>
            </div>
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
