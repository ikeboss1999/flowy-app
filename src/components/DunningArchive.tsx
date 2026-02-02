import React, { useState, useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useCustomers';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { DunningPreviewModal } from './DunningPreviewModal';
import { FileText, Calendar, Eye, Users, ChevronRight, Hash } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { cn } from "@/lib/utils";

export function DunningArchive() {
    const { invoices } = useInvoices();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { data: invoiceSettings } = useInvoiceSettings();

    const [selectedCustomerId, setSelectedCustomerId] = useState<string | "all">("all");
    const [previewItem, setPreviewItem] = useState<{
        invoice: Invoice;
        level: number;
        date: string;
    } | null>(null);

    // Grouping Logic: Customer -> Invoice -> Dunning Entry
    const groupedData = useMemo(() => {
        const groups: Record<string, {
            customerName: string,
            invoices: Record<string, {
                invoiceNumber: string,
                totalAmount: number,
                entries: {
                    level: number,
                    date: string,
                    fee: number,
                    invoiceId: string
                }[]
            }>
        }> = {};

        invoices.forEach(inv => {
            if (!inv.dunningHistory || inv.dunningHistory.length === 0) return;

            if (!groups[inv.customerId]) {
                groups[inv.customerId] = {
                    customerName: inv.customerName,
                    invoices: {}
                };
            }

            if (!groups[inv.customerId].invoices[inv.id]) {
                groups[inv.customerId].invoices[inv.id] = {
                    invoiceNumber: inv.invoiceNumber,
                    totalAmount: inv.totalAmount,
                    entries: []
                };
            }

            inv.dunningHistory.forEach(entry => {
                groups[inv.customerId].invoices[inv.id].entries.push({
                    ...entry,
                    invoiceId: inv.id
                });
            });

            // Sort entries within invoice by level/date
            groups[inv.customerId].invoices[inv.id].entries.sort((a, b) => b.level - a.level);
        });

        return groups;
    }, [invoices]);

    const activeCustomers = customers.filter(c => groupedData[c.id]);

    const getLevelName = (l: number) => {
        switch (l) {
            case 1: return "Zahlungserinnerung";
            case 2: return "1. Mahnung";
            case 3: return "2. Mahnung";
            case 4: return "Letzte Mahnung";
            default: return "Mahnung";
        }
    };

    if (Object.keys(groupedData).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                    <FileText className="h-12 w-12 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Mahnarchiv leer</h3>
                <p className="text-slate-500 font-medium">Es wurden noch keine Mahnungen erstellt.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Customer Filter */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                    <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setSelectedCustomerId("all")}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                selectedCustomerId === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Alle Kunden
                        </button>
                        {activeCustomers.map(customer => (
                            <button
                                key={customer.id}
                                onClick={() => setSelectedCustomerId(customer.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                    selectedCustomerId === customer.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {customer.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grouped Archive View */}
            <div className="space-y-6">
                {Object.entries(groupedData)
                    .filter(([custId]) => selectedCustomerId === "all" || selectedCustomerId === custId)
                    .map(([custId, data]) => (
                        <div key={custId} className="space-y-4 animate-in fade-in duration-500">
                            <div className="flex items-center gap-3 px-2">
                                <Users className="h-5 w-5 text-slate-400" />
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{data.customerName}</h3>
                                <div className="h-px flex-1 bg-slate-100 mx-4"></div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{Object.keys(data.invoices).length} Rechnungen</span>
                            </div>

                            <div className="grid gap-4">
                                {Object.entries(data.invoices).map(([invId, invoice]) => (
                                    <div key={invId} className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all duration-300">
                                        <div className="p-6 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                                                    <Hash className="h-5 w-5 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">Rechnung {invoice.invoiceNumber}</p>
                                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Gesamt: € {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <div className="p-4 space-y-2">
                                            {invoice.entries.map((entry, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase",
                                                            entry.level === 1 ? "bg-orange-50 text-orange-600" :
                                                                entry.level === 4 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                                                        )}>
                                                            L{entry.level}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{getLevelName(entry.level)}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                <Calendar className="h-3 w-3" />
                                                                {new Date(entry.date).toLocaleDateString('de-DE')}
                                                                {entry.fee > 0 && (
                                                                    <>
                                                                        <span className="mx-1">•</span>
                                                                        <span>Gebühr: € {entry.fee.toFixed(2)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const inv = invoices.find(i => i.id === entry.invoiceId);
                                                            if (inv) setPreviewItem({ invoice: inv, level: entry.level, date: entry.date });
                                                        }}
                                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                        title="Ansehen & Drucken"
                                                    >
                                                        <Eye className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
            </div>

            {previewItem && (() => {
                const customer = customers.find(c => c.id === previewItem.invoice.customerId);
                if (!customer) return null;

                return (
                    <DunningPreviewModal
                        isOpen={!!previewItem}
                        onClose={() => setPreviewItem(null)}
                        invoice={previewItem.invoice}
                        customer={customer}
                        companySettings={companySettings}
                        invoiceSettings={invoiceSettings}
                        level={previewItem.level}
                        date={previewItem.date}
                    />
                );
            })()}
        </div>
    );
}
