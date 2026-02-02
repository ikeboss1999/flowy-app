"use client";

import React, { useState, useMemo } from "react";
import {
    Calendar,
    TrendingUp,
    FileText,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Edit2,
    Euro
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { DeviationModal } from "@/components/DeviationModal";
import { cn } from "@/lib/utils";
import { Invoice } from "@/types/invoice";

interface QuarterData {
    quarter: number;
    year: number;
    invoices: Invoice[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    deviation: number;
}

export default function ReportsPage() {
    const { invoices, updateInvoice, isLoading } = useInvoices();
    const { customers } = useCustomers();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [expandedQuarters, setExpandedQuarters] = useState<string[]>(['Q1', 'Q2', 'Q3', 'Q4']);
    const [deviationModalInvoice, setDeviationModalInvoice] = useState<Invoice | null>(null);

    const getQuarter = (date: string): number => {
        const month = new Date(date).getMonth();
        return Math.floor(month / 3) + 1;
    };

    const quarterlyData = useMemo(() => {
        const quarters: QuarterData[] = [
            { quarter: 1, year: selectedYear, invoices: [], subtotal: 0, taxAmount: 0, totalAmount: 0, paidAmount: 0, deviation: 0 },
            { quarter: 2, year: selectedYear, invoices: [], subtotal: 0, taxAmount: 0, totalAmount: 0, paidAmount: 0, deviation: 0 },
            { quarter: 3, year: selectedYear, invoices: [], subtotal: 0, taxAmount: 0, totalAmount: 0, paidAmount: 0, deviation: 0 },
            { quarter: 4, year: selectedYear, invoices: [], subtotal: 0, taxAmount: 0, totalAmount: 0, paidAmount: 0, deviation: 0 },
        ];

        invoices.forEach(invoice => {
            const invoiceYear = new Date(invoice.issueDate).getFullYear();
            if (invoiceYear === selectedYear) {
                const quarter = getQuarter(invoice.issueDate);
                const quarterData = quarters[quarter - 1];

                quarterData.invoices.push(invoice);
                quarterData.subtotal += invoice.subtotal;
                quarterData.taxAmount += invoice.taxAmount;
                quarterData.totalAmount += invoice.totalAmount;
                quarterData.paidAmount += invoice.paidAmount ?? invoice.totalAmount;
                quarterData.deviation += (invoice.paidAmount ?? invoice.totalAmount) - invoice.totalAmount;
            }
        });

        return quarters;
    }, [invoices, selectedYear]);

    const yearTotal = useMemo(() => {
        return quarterlyData.reduce((acc, q) => ({
            subtotal: acc.subtotal + q.subtotal,
            taxAmount: acc.taxAmount + q.taxAmount,
            totalAmount: acc.totalAmount + q.totalAmount,
            paidAmount: acc.paidAmount + q.paidAmount,
            deviation: acc.deviation + q.deviation,
        }), { subtotal: 0, taxAmount: 0, totalAmount: 0, paidAmount: 0, deviation: 0 });
    }, [quarterlyData]);

    const availableYears = useMemo(() => {
        const years = new Set(invoices.map(inv => new Date(inv.issueDate).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [invoices]);

    const toggleQuarter = (quarter: string) => {
        setExpandedQuarters(prev =>
            prev.includes(quarter)
                ? prev.filter(q => q !== quarter)
                : [...prev, quarter]
        );
    };

    const handleSaveDeviation = (updatedInvoice: Invoice) => {
        updateInvoice(updatedInvoice.id, updatedInvoice);
    };

    if (isLoading) {
        return <div className="p-10 text-slate-400 font-bold">Laden...</div>;
    }

    return (
        <div className="flex-1 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Finanzen</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Quartals<span className="text-slate-300 font-light">Auswertung</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Detaillierte Übersicht aller Rechnungen nach Quartalen.</p>
                </div>

                {/* Year Selector */}
                <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Year Summary */}
            <div className="glass-card p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
                <h3 className="text-lg font-black text-indigo-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Jahresübersicht {selectedYear}
                </h3>
                <div className="grid grid-cols-5 gap-6">
                    {[
                        { label: "Netto", value: yearTotal.subtotal, color: "text-slate-600" },
                        { label: "Steuer", value: yearTotal.taxAmount, color: "text-amber-600" },
                        { label: "Brutto", value: yearTotal.totalAmount, color: "text-indigo-600" },
                        { label: "Bezahlt", value: yearTotal.paidAmount, color: "text-emerald-600" },
                        { label: "Abweichung", value: yearTotal.deviation, color: yearTotal.deviation >= 0 ? "text-emerald-600" : "text-rose-600" },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">{stat.label}</p>
                            <p className={cn("text-4xl font-black tabular-nums tracking-tighter", stat.color)}>
                                € {stat.value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quarterly Reports */}
            <div className="space-y-6">
                {quarterlyData.map((quarterData) => {
                    const quarterId = `Q${quarterData.quarter}`;
                    const isExpanded = expandedQuarters.includes(quarterId);
                    const hasInvoices = quarterData.invoices.length > 0;

                    return (
                        <div key={quarterId} className="glass-card overflow-hidden">
                            {/* Quarter Header */}
                            <button
                                onClick={() => toggleQuarter(quarterId)}
                                className="w-full px-8 py-6 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-xl font-black text-slate-900">
                                            {quarterId} {selectedYear}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium">
                                            {quarterData.invoices.length} Rechnung{quarterData.invoices.length !== 1 ? 'en' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-10">
                                    <div className="grid grid-cols-5 gap-10 text-base">
                                        <div className="text-right min-w-[120px]">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 ">Netto</p>
                                            <p className="text-xl font-black text-slate-900 tabular-nums">
                                                € {quarterData.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="text-right min-w-[120px]">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Steuer</p>
                                            <p className="text-xl font-black text-amber-600 tabular-nums">
                                                € {quarterData.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="text-right min-w-[120px]">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Brutto</p>
                                            <p className="text-xl font-black text-indigo-600 tabular-nums">
                                                € {quarterData.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="text-right min-w-[120px]">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Bezahlt</p>
                                            <p className="text-xl font-black text-emerald-600 tabular-nums">
                                                € {quarterData.paidAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="text-right min-w-[120px]">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Abweichung</p>
                                            <p className={cn("text-xl font-black tabular-nums", quarterData.deviation >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                {quarterData.deviation >= 0 ? '+' : ''}€ {quarterData.deviation.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                            </button>

                            {/* Quarter Details */}
                            {isExpanded && hasInvoices && (
                                <div className="border-t border-slate-100">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Rechnung</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Kunde</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Netto</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Steuer</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Brutto</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Bezahlt</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Abweichung</th>
                                                <th className="px-6 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Aktion</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {quarterData.invoices.map((invoice) => {
                                                const deviation = (invoice.paidAmount ?? invoice.totalAmount) - invoice.totalAmount;
                                                const hasDeviation = Math.abs(deviation) > 0.01;

                                                return (
                                                    <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-slate-900">#{invoice.invoiceNumber}</p>
                                                            <p className="text-xs text-slate-400">{new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{invoice.customerName}</td>
                                                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                            € {invoice.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-amber-600">
                                                            € {invoice.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                                            € {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                            € {(invoice.paidAmount ?? invoice.totalAmount).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {hasDeviation ? (
                                                                <div className="flex flex-col items-end">
                                                                    <span className={cn("font-black", deviation >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                                        {deviation >= 0 ? '+' : ''}€ {Math.abs(deviation).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                    {invoice.paymentDeviation?.reason && (
                                                                        <span className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                                            <AlertCircle className="h-3 w-3" />
                                                                            {invoice.paymentDeviation.reason.substring(0, 20)}...
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 font-bold">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => setDeviationModalInvoice(invoice)}
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all"
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                                Zahlung
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {isExpanded && !hasInvoices && (
                                <div className="p-12 text-center text-slate-400">
                                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-medium">Keine Rechnungen in diesem Quartal</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <DeviationModal
                isOpen={!!deviationModalInvoice}
                onClose={() => setDeviationModalInvoice(null)}
                onSave={handleSaveDeviation}
                invoice={deviationModalInvoice}
            />
        </div>
    );
}
