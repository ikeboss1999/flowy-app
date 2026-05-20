"use client";

import React, { useState, useMemo } from 'react';
import {
    FileText,
    FileSignature,
    TrendingUp,
    Plus,
    Calendar as CalendarIcon,
    ArrowUpRight,
    Eye,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useInvoices } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useCustomers';
import { useTodos } from '@/hooks/useTodos';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { Invoice } from '@/types/invoice';
import { InvoicePreviewModal } from '@/components/InvoicePreviewModal';
import { CalendarWidget } from '@/components/CalendarWidget';

export default function DashboardPage() {
    const currentYear = new Date().getFullYear();
    const { invoices, isLoading } = useInvoices();
    const { customers } = useCustomers();
    const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
    const { data: companySettings } = useCompanySettings();
    const { data: accountSettings } = useAccountSettings();
    const { summary } = useDashboardSummary();
    const [newTodo, setNewTodo] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isTodoMinimized, setIsTodoMinimized] = useState(false);

    React.useEffect(() => {
        try {
            const savedState = localStorage.getItem('flowy_todo_minimized');
            if (savedState !== null) {
                setIsTodoMinimized(savedState === 'true');
            }
        } catch (e) {
            console.error('Error reading localStorage', e);
        }
    }, []);

    const toggleTodoMinimized = () => {
        const newValue = !isTodoMinimized;
        setIsTodoMinimized(newValue);
        try {
            localStorage.setItem('flowy_todo_minimized', String(newValue));
        } catch (e) {
            console.error('Error setting localStorage', e);
        }
    };

    const sortedInvoices = useMemo(() => {
        const year = new Date().getFullYear();
        return [...invoices]
            .filter(inv => new Date(inv.issueDate).getFullYear() === year)
            .sort((a, b) => (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "", undefined, { numeric: true }));
    }, [invoices]);

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;
        addTodo(newTodo);
        setNewTodo("");
    };

    const stats = {
        totalRevenue: summary?.totalRevenue ?? 0,
        openAmount: summary?.openAmount ?? 0,
        openInvoicesCount: summary?.openInvoicesCount ?? 0,
        openOffersCount: summary?.openOffersCount ?? 0,
        openOffersAmount: summary?.openOffersAmount ?? 0,
    };

    return (
        <div className="p-8 lg:p-12 space-y-12 animate-in fade-in duration-1000">
            {/* Header section - Premium & Clean */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight font-outfit">Dashboard</h2>
                    <p className="text-slate-500 font-bold flex items-center gap-2">
                        Willkommen zurück, <span className="text-indigo-600">{accountSettings?.name || "Benutzer"}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        Status für {currentYear}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/offers/new"
                        className="h-14 px-8 bg-white border-2 border-slate-100 text-slate-700 rounded-[1.25rem] flex items-center gap-3 font-black text-xs uppercase tracking-[0.15em] shadow-sm hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-95"
                    >
                        <FileSignature className="h-5 w-5" /> Angebot
                    </Link>
                    <Link
                        href="/invoices/new"
                        className="h-14 px-8 bg-primary-gradient text-white rounded-[1.25rem] flex items-center gap-3 font-black text-xs uppercase tracking-[0.15em] shadow-2xl shadow-indigo-500/30 hover:scale-[1.05] active:scale-95 transition-all"
                    >
                        <Plus className="h-5 w-5 text-white" /> Rechnung
                    </Link>
                </div>
            </div>

            {/* Stats Grid - Premium Glass Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {[
                    { label: "Gesamtumsatz", value: stats.totalRevenue, sub: "Bezahlt dieses Jahr", color: "indigo", icon: TrendingUp, href: "/reports" },
                    { label: "Offener Betrag", value: stats.openAmount, sub: "Gesamte Außenstände", color: "rose", icon: AlertCircle, dark: true },
                    { label: "Angebote", value: stats.openOffersAmount, sub: `${stats.openOffersCount} offene Angebote`, color: "emerald", icon: FileSignature, href: "/offers" },
                ].map((stat, i) => {
                    const CardWrapper = stat.href ? Link : 'div';
                    return (
                        <CardWrapper
                            key={i}
                            href={stat.href || "#"}
                            className={cn(
                                "p-8 rounded-[3rem] border transition-all duration-500 group relative overflow-hidden block",
                                stat.dark ? "bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-900/20" : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/5 shadow-sm",
                                stat.href && "hover:-translate-y-1 cursor-pointer"
                            )}
                        >
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-500 group-hover:scale-110",
                                    stat.dark ? "bg-white/10 text-white" : `bg-${stat.color}-50 text-${stat.color}-600`
                                )}>
                                    <stat.icon className="h-7 w-7" />
                                </div>
                                <div className={cn("text-[10px] font-black uppercase tracking-[0.2em]", stat.dark ? "text-white/30" : "text-slate-400")}>
                                    {stat.label}
                                    {stat.href && <ArrowUpRight className="h-3 w-3 ml-1 inline-block opacity-0 group-hover:opacity-100 transition-all" />}
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h4 className="text-3xl font-black tracking-tight mb-2">
                                    {stat.value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                </h4>
                                <p className={cn("text-[11px] font-bold", stat.dark ? "text-white/40" : "text-slate-400")}>{stat.sub}</p>
                            </div>
                        </CardWrapper>
                    );
                })}
            </div>

            {/* Main Content Area - 2:1 Split */}
            <div className="grid grid-cols-1 2xl:grid-cols-12 gap-12 items-start">
                {/* Recent Invoices - Left (8/12 = 2/3) */}
                <div className="2xl:col-span-8 space-y-8">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <FileText className="h-5 w-5" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Letzte Rechnungen</h3>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link href="/invoices" className="text-xs font-black text-indigo-600 hover:text-indigo-800 tracking-widest uppercase flex items-center gap-2">
                                Alle ansehen <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rechnung</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kunde</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Betrag</th>
                                    <th className="px-10 py-6 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="py-24 text-center font-black text-slate-300 uppercase tracking-[0.2em] text-[11px]">Ladevorgang...</td></tr>
                                ) : sortedInvoices.length === 0 ? (
                                    <tr><td colSpan={5} className="py-24 text-center font-black text-slate-300 uppercase tracking-[0.2em] text-[11px]">Keine Rechnungen gefunden</td></tr>
                                ) : (
                                    sortedInvoices.slice(-6).map((invoice) => (
                                        <tr key={invoice.id} className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                                            <td className="px-10 py-8">
                                                <p className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">#{invoice.invoiceNumber}</p>
                                                <p className="text-xs text-slate-400 font-bold mt-1">Vom {new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                                            </td>
                                            <td className="px-10 py-8 text-base font-bold text-slate-700">{invoice.customerName}</td>
                                            <td className="px-10 py-8">
                                                <span className={cn(
                                                    "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border",
                                                    invoice.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    invoice.status === 'overdue' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {invoice.status === 'paid' ? 'Bezahlt' : invoice.status === 'overdue' ? 'Fällig' : 'Offen'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <p className="text-lg font-black text-slate-900">{invoice.totalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                    <Eye className="h-6 w-6" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="2xl:col-span-4 space-y-8">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tagesplan</h3>
                        </div>
                        <Link href="/calendar" className="text-xs font-black text-indigo-600 hover:text-indigo-800 tracking-widest uppercase flex items-center gap-2">
                            Kalender <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <CalendarWidget isCompact={true} />
                </div>
            </div>

            <InvoicePreviewModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoice={selectedInvoice}
                customer={customers.find(c => c.id === selectedInvoice?.customerId)}
                companySettings={companySettings}
            />
        </div>
    );
}
