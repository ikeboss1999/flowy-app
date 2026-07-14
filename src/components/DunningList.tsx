import React, { useState } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useCustomers';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { DunningModal } from '@/components/DunningModal';
import { AlertTriangle, Clock, ArrowRight, CalendarClock, Euro, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Invoice } from '@/types/invoice';

export function DunningList() {
    const { invoices, updateInvoice } = useInvoices();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { data: invoiceSettings } = useInvoiceSettings();

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Filter for overdue invoices or those already in dunning
    const getDueDate = (invoice: Invoice) => {
        const issueDate = new Date(invoice.issueDate);
        const paymentDays = parseInt(invoice.paymentTerms) || 0;
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + paymentDays);
        return dueDate;
    };

    const overdueInvoices = invoices.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'draft' || inv.status === 'canceled') return false;

        const today = new Date();
        const dueDate = getDueDate(inv);
        const isOverdue = today > dueDate;
        const isAlreadyInDunning = (inv.dunningLevel || 0) > 0;

        return isOverdue || isAlreadyInDunning;
    }).sort((a, b) => {
        const levelDiff = (b.dunningLevel || 0) - (a.dunningLevel || 0);
        if (levelDiff !== 0) return levelDiff;

        const dueDiff = getDueDate(a).getTime() - getDueDate(b).getTime();
        if (dueDiff !== 0) return dueDiff;

        return b.invoiceNumber.localeCompare(a.invoiceNumber, 'de', { numeric: true });
    });

    const handleDunningConfirm = async (level: number, date: string, pdfPath: string) => {
        if (!selectedInvoice) return;

        const historyEntry = {
            level,
            date,
            fee: invoiceSettings.dunningLevels[`level${level}` as keyof typeof invoiceSettings.dunningLevels]?.fee || 0,
            pdfPath,
            pdfUrl: pdfPath,
        };

        await updateInvoice(selectedInvoice.id, {
            dunningLevel: level,
            lastDunningDate: date,
            dunningHistory: [...(selectedInvoice.dunningHistory || []), historyEntry],
            status: 'overdue'
        });
        setSelectedInvoice(null);
    };

    if (overdueInvoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-[32px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 py-20 shadow-sm">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
                    <Clock className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-slate-900">Alles erledigt!</h3>
                <p className="font-semibold text-slate-500">Es gibt keine überfälligen Rechnungen.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {overdueInvoices.map(invoice => {
                    const customer = customers.find(c => c.id === invoice.customerId);
                    const dunningLevel = invoice.dunningLevel || 0;
                    const dueDate = getDueDate(invoice);

                    return (
                        <div key={invoice.id} className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5">
                            <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 items-center gap-5">
                                    <div className={cn(
                                        "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
                                        dunningLevel > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'
                                    )}>
                                        <AlertTriangle className="h-7 w-7" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500">
                                                {invoice.invoiceNumber}
                                            </span>
                                            <span className={cn(
                                                "rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider",
                                                dunningLevel === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    dunningLevel === 1 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-red-100 text-red-700'
                                            )}>
                                                {dunningLevel === 0 ? 'Überfällig' : `Mahnstufe ${dunningLevel}`}
                                            </span>
                                        </div>
                                        <h4 className="truncate text-2xl font-black text-slate-950">{customer?.name || invoice.customerName}</h4>
                                        <div className="mt-2 flex flex-wrap gap-4 text-sm font-bold text-slate-500">
                                            <span className="inline-flex items-center gap-2">
                                                <CalendarClock className="h-4 w-4 text-slate-400" />
                                                Fällig: {dueDate.toLocaleDateString('de-DE')}
                                            </span>
                                            <span className="inline-flex items-center gap-2">
                                                <FileWarning className="h-4 w-4 text-slate-400" />
                                                Letzte Mahnung: {invoice.lastDunningDate ? new Date(invoice.lastDunningDate).toLocaleDateString('de-DE') : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-end">
                                    <div className="rounded-2xl bg-slate-50 px-5 py-4 text-left sm:text-right">
                                        <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 sm:justify-end">
                                            <Euro className="h-4 w-4" />
                                            Offener Betrag
                                        </p>
                                        <p className="text-2xl font-black text-slate-950">€ {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedInvoice(invoice)}
                                        disabled={dunningLevel >= 4}
                                        className={cn(
                                            "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black transition-all",
                                            dunningLevel >= 4
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-primary-gradient text-white shadow-lg shadow-indigo-900/20 hover:shadow-xl active:scale-95"
                                        )}
                                    >
                                        {dunningLevel >= 4 ? 'Max. Mahnstufe' : 'Mahnung erstellen'} <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedInvoice && (() => {
                const customer = customers.find(c => c.id === selectedInvoice.customerId);
                if (!customer) return null; // Should not happen ideally

                return (
                    <DunningModal
                        isOpen={!!selectedInvoice}
                        onClose={() => setSelectedInvoice(null)}
                        invoice={selectedInvoice}
                        customer={customer}
                        companySettings={companySettings}
                        invoiceSettings={invoiceSettings}
                        onConfirm={handleDunningConfirm}
                    />
                );
            })()}
        </div>
    );
}
