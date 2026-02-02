import React, { useState } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useCustomers';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { DunningModal } from '@/components/DunningModal';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Invoice } from '@/types/invoice';

export function DunningList() {
    const { invoices, updateInvoice } = useInvoices();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { data: invoiceSettings } = useInvoiceSettings();

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Filter for overdue invoices or those already in dunning
    const overdueInvoices = invoices.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'draft' || inv.status === 'canceled') return false;

        // Check if overdue based on payment terms
        const issueDate = new Date(inv.issueDate);
        const today = new Date();
        const paymentDays = parseInt(inv.paymentTerms) || 0; // simplistic parsing, works for '14 Tage'

        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + paymentDays);

        const isOverdue = today > dueDate;
        const isAlreadyInDunning = (inv.dunningLevel || 0) > 0;

        return isOverdue || isAlreadyInDunning;
    });

    const handleDunningConfirm = (level: number, date: string) => {
        if (!selectedInvoice) return;

        const historyEntry = {
            level,
            date,
            fee: invoiceSettings.dunningLevels[`level${level}` as keyof typeof invoiceSettings.dunningLevels]?.fee || 0
        };

        updateInvoice(selectedInvoice.id, {
            dunningLevel: level,
            lastDunningDate: date,
            dunningHistory: [...(selectedInvoice.dunningHistory || []), historyEntry],
            status: 'overdue'
        });
        setSelectedInvoice(null);
    };

    if (overdueInvoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <Clock className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Alles erledigt!</h3>
                <p className="text-slate-500">Es gibt keine überfälligen Rechnungen.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {overdueInvoices.map(invoice => {
                    const customer = customers.find(c => c.id === invoice.customerId);
                    const dunningLevel = invoice.dunningLevel || 0;

                    return (
                        <div key={invoice.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-6">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${dunningLevel > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="font-bold text-slate-900">{invoice.invoiceNumber}</h4>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${dunningLevel === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                dunningLevel === 1 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {dunningLevel === 0 ? 'Überfällig' : `Mahnstufe ${dunningLevel}`}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">{customer?.name || invoice.customerName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Offener Betrag</p>
                                    <p className="font-black text-slate-900">€ {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Letzte Mahnung</p>
                                    <p className="font-medium text-slate-700">
                                        {invoice.lastDunningDate ? new Date(invoice.lastDunningDate).toLocaleDateString('de-DE') : '-'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedInvoice(invoice)}
                                    className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors flex items-center gap-2"
                                >
                                    Mahnung erstellen <ArrowRight className="h-4 w-4" />
                                </button>
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
