"use client";

import React, { useState, useMemo } from 'react';
import {
    BarChart3,
    Users,
    FileText,
    TrendingUp,
    Plus,
    CheckCircle2,
    Calendar as CalendarIcon,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    MoreVertical,
    Download,
    AlertCircle,
    Trash2,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useInvoices } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useCustomers';
import { useTodos } from '@/hooks/useTodos';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { Invoice } from '@/types/invoice';
import { Customer } from '@/types/customer';
import { InvoicePreviewModal } from '@/components/InvoicePreviewModal';
import { CalendarWidget } from '@/components/CalendarWidget';

export default function DashboardPage() {
    const { user } = useAuth();
    const { invoices, updateInvoice, isLoading } = useInvoices();
    const { customers } = useCustomers();
    const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
    const { data: companySettings } = useCompanySettings();
    const { data: accountSettings } = useAccountSettings();
    const [newTodo, setNewTodo] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isTodoMinimized, setIsTodoMinimized] = useState(false);

    // Sorting State
    const [sortBy, setSortBy] = useState<string>("number");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");


    const currentYear = new Date().getFullYear();

    const stats = useMemo(() => {
        const currentYearInvoices = invoices.filter(inv => {
            const invYear = new Date(inv.issueDate).getFullYear();
            return invYear === currentYear;
        });

        const totalRevenue = currentYearInvoices.reduce((sum, inv) => inv.status === 'paid' ? sum + inv.totalAmount : sum, 0);
        const openInvoicesCount = currentYearInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').length;
        const openAmount = currentYearInvoices.reduce((sum, inv) => inv.status !== 'paid' ? sum + inv.totalAmount : sum, 0);

        return { totalRevenue, openInvoicesCount, openAmount };
    }, [invoices, currentYear]);

    const sortedInvoices = useMemo(() => {
        const currentYearInvoices = invoices.filter(inv => {
            const invYear = new Date(inv.issueDate).getFullYear();
            return invYear === currentYear;
        });

        return [...currentYearInvoices].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'number':
                    comparison = (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "", undefined, { numeric: true });
                    break;
                case 'customer':
                    comparison = (a.customerName || "").localeCompare(b.customerName || "");
                    break;
                case 'amount':
                    comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
                    break;
                case 'date':
                default:
                    comparison = new Date(a.issueDate || 0).getTime() - new Date(b.issueDate || 0).getTime();
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [invoices, currentYear, sortBy, sortOrder]);

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;
        addTodo(newTodo);
        setNewTodo("");
    };

    const handleDownload = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
    };

    return (
        <div className="p-10 space-y-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 block">Dashboard</span>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight font-outfit">Willkommen zurück, {accountSettings?.name || "Benutzer"}!</h2>
                    <p className="text-slate-500 text-lg font-medium mt-1">Hier ist eine Übersicht deines Unternehmens.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/invoices/new"
                        className="h-14 px-8 bg-primary-gradient text-white rounded-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus className="h-5 w-5" /> Rechnung erstellen
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Revenue Card */}
                <div className="glass-card p-8 group hover:border-indigo-500/30 transition-all duration-500 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all" />
                    <div className="flex justify-between items-start mb-6">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100/50">
                            <BarChart3 className="h-7 w-7" />
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            <ArrowUpRight className="h-3 w-3" /> +12%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
                            {stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </h4>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Gesamtumsatz <span className="h-1 w-1 bg-slate-300 rounded-full" /> Bezahlt
                        </p>
                    </div>
                </div>

                {/* Open Invoices Card */}
                <div className="glass-card p-8 group hover:border-amber-500/30 transition-all duration-500 cursor-pointer overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-all" />
                    <div className="flex justify-between items-start mb-6">
                        <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100/50">
                            <FileText className="h-7 w-7" />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold border border-slate-100">
                            Aktuell
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
                            {stats.openInvoicesCount} Rechnungen
                        </h4>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Offene Posten <span className="h-1 w-1 bg-slate-300 rounded-full" /> Unbezahlt
                        </p>
                    </div>
                </div>

                {/* Open Amount Card */}
                <div className="glass-card p-8 group hover:border-rose-500/30 transition-all duration-500 cursor-pointer overflow-hidden relative text-white bg-slate-900">
                    <div className="absolute inset-0 bg-primary-gradient opacity-10 pointer-events-none" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-sm border border-white/10">
                            <AlertCircle className="h-7 w-7" />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white rounded-full text-xs font-bold">
                            Fällig
                        </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <h4 className="text-4xl font-black text-white tracking-tighter">
                            {stats.openAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </h4>
                        <p className="text-sm font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                            Offener Betrag <span className="h-1 w-1 bg-white/20 rounded-full" /> Gesamt
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Recent Invoices Column */}
                <div className="xl:col-span-2 space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                Letzte Rechnungen
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sortieren:</span>
                                    <select
                                        value={`${sortBy}-${sortOrder}`}
                                        onChange={(e) => {
                                            const [key, order] = e.target.value.split('-');
                                            setSortBy(key);
                                            setSortOrder(order as "asc" | "desc");
                                        }}
                                        className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                    >
                                        <option value="date-desc">Datum (Neu zuerst)</option>
                                        <option value="date-asc">Datum (Alt zuerst)</option>
                                        <option value="number-desc">Rechnungsnummer (Z-A)</option>
                                        <option value="number-asc">Rechnungsnummer (A-Z)</option>
                                        <option value="amount-desc">Betrag (Hoch zuerst)</option>
                                        <option value="amount-asc">Betrag (Gering zuerst)</option>
                                        <option value="customer-asc">Kunde (A-Z)</option>
                                        <option value="customer-desc">Kunde (Z-A)</option>
                                    </select>
                                </div>
                                <Link
                                    href="/invoices"
                                    className="text-sm font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-4 decoration-2 decoration-indigo-200 hover:decoration-indigo-400 transition-all"
                                >
                                    Alle Rechnungen
                                </Link>
                            </div>
                        </div>

                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nummer</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Kunde</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Betrag</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-10 text-slate-400">Lade Rechnungen...</td>
                                        </tr>
                                    ) : (
                                        sortedInvoices.map((invoice) => (
                                            <tr key={invoice.id} className="group hover:bg-slate-50/30 transition-colors cursor-pointer">
                                                <td className="px-6 py-5">
                                                    <p className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">#{invoice.invoiceNumber}</p>
                                                    <p className="text-xs text-slate-400 font-medium">Vom {new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="text-base font-bold text-slate-800">{invoice.customerName}</p>
                                                </td>
                                                <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                                    <div className="relative inline-block">
                                                        <select
                                                            value={invoice.status}
                                                            onChange={(e) => updateInvoice(invoice.id, { ...invoice, status: e.target.value as any })}
                                                            className={cn(
                                                                "appearance-none pl-3 pr-8 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all",
                                                                invoice.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100 focus:ring-emerald-500" :
                                                                    invoice.status === 'overdue' ? "bg-rose-50 text-rose-600 border-rose-100 focus:ring-rose-500" :
                                                                        "bg-amber-50 text-amber-600 border-amber-100 focus:ring-amber-500"
                                                            )}
                                                        >
                                                            <option value="paid">Bezahlt</option>
                                                            <option value="pending">Offen</option>
                                                            <option value="overdue">Fällig</option>
                                                        </select>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <svg className={cn(
                                                                "h-3 w-3",
                                                                invoice.status === 'paid' ? "text-emerald-600" :
                                                                    invoice.status === 'overdue' ? "text-rose-600" : "text-amber-600"
                                                            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-slate-900">
                                                    {invoice.totalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownload(invoice);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Calendar Widget in Main Column */}
                    <CalendarWidget />
                </div>

                {/* To-Do Column */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-slate-900">To-Do Liste</h3>
                        <button
                            onClick={() => setIsTodoMinimized(!isTodoMinimized)}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
                        >
                            {isTodoMinimized ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className={cn("glass-card p-6 flex flex-col transition-all duration-300", isTodoMinimized ? "h-fit space-y-0" : "h-full space-y-6")}>
                        {!isTodoMinimized && (
                            <>
                                <form onSubmit={handleAddTodo} className="relative">
                                    <input
                                        type="text"
                                        value={newTodo}
                                        onChange={(e) => setNewTodo(e.target.value)}
                                        placeholder="Aufgabe hinzufügen..."
                                        className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all placeholder:text-slate-400"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-2 top-2 h-10 w-10 bg-primary-gradient text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:scale-[1.05] active:scale-95 transition-all"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </form>

                                <div className="flex-1 space-y-3">
                                    {todos.map((todo) => (
                                        <div
                                            key={todo.id}
                                            className={cn(
                                                "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                                                todo.completed
                                                    ? "bg-slate-50 border-transparent opacity-60"
                                                    : "bg-white border-slate-100 hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/5"
                                            )}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTodo(todo.id);
                                                }}
                                                className={cn(
                                                    "mt-1 h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                                                    todo.completed ? "bg-indigo-500 text-white" : "border-2 border-slate-200 text-transparent group-hover:border-indigo-400"
                                                )}
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </button>
                                            <div
                                                className="flex-1 min-w-0"
                                                onClick={() => toggleTodo(todo.id)}
                                            >
                                                <p className={cn(
                                                    "font-bold text-base leading-tight decoration-2 underline-offset-4",
                                                    todo.completed ? "text-slate-400 line-through" : "text-slate-800"
                                                )}>
                                                    {todo.task}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest",
                                                        todo.priority === 'high' ? "text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.1)]" :
                                                            todo.priority === 'medium' ? "text-amber-500" : "text-slate-400"
                                                    )}>
                                                        {todo.priority === 'high' ? 'Dringend' : todo.priority === 'medium' ? 'Normal' : 'Nachrangig'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTodo(todo.id);
                                                }}
                                                className="mt-1 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
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
        </div>
    );
}
