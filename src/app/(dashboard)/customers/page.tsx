"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    Search,
    Plus,
    Filter,
    User,
    Users,
    Briefcase,
    MoreHorizontal,
    Edit2,
    Trash2,
    ExternalLink,
    Mail,
    Phone,
    MapPin,
    Clock,
    ShieldAlert,
    CheckCircle2
} from "lucide-react";
import { Customer, CustomerType } from "@/types/customer";
import { CustomerModal } from "@/components/CustomerModal";
import { useCustomers } from "@/hooks/useCustomers";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
    const { customers, addCustomer, updateCustomer, deleteCustomer, isLoading } = useCustomers();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<CustomerType | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);

    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            const matchesSearch =
                customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.email.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = filterType === "all" || customer.type === filterType;

            return matchesSearch && matchesType;
        });
    }, [customers, searchQuery, filterType]);

    const handleSaveCustomer = (customer: Customer) => {
        if (editingCustomer) {
            updateCustomer(customer.id, customer);
        } else {
            addCustomer(customer);
        }
    };

    const handleDeleteCustomer = (id: string) => {
        if (confirm("Sind Sie sicher, dass Sie diesen Kunden löschen möchten?")) {
            deleteCustomer(id);
        }
    };

    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return <div className="p-10 text-slate-400 font-bold">Laden...</div>;
    }

    return (
        <div className="flex-1 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Users className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">CRM</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Kunden <span className="text-slate-300 font-light">Verwalten</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Verwalten Sie Ihre Kundenbeziehungen und Kontaktdaten zentral.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCustomer(undefined);
                        setIsModalOpen(true);
                    }}
                    className="bg-primary-gradient text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus className="h-5 w-5" /> Neuer Kunde
                </button>
            </div>

            {/* Quick Stats / Highlights */}
            <div className="grid grid-cols-3 gap-6">
                {[
                    { label: "Gesamt", count: customers.length, color: "text-slate-600", bg: "bg-slate-100", icon: User },
                    { label: "Privat", count: customers.filter(c => c.type === 'private').length, color: "text-purple-600", bg: "bg-purple-50", icon: User },
                    { label: "Geschäft", count: customers.filter(c => c.type === 'business').length, color: "text-emerald-600", bg: "bg-emerald-50", icon: Briefcase },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                                    <Icon className={cn("h-6 w-6", stat.color)} />
                                </div>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <span className={cn("font-black text-3xl px-4 py-2 rounded-2xl", stat.color, stat.bg)}>{stat.count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Filters & Actions bar */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Kunden suchen nach Name oder E-Mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                    />
                </div>

                <div className="bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
                    {[
                        { id: "all", label: "Alle", icon: Filter },
                        { id: "private", label: "Privat", icon: User },
                        { id: "business", label: "Geschäft", icon: Briefcase }
                    ].map((btn) => {
                        const Icon = btn.icon;
                        const active = filterType === btn.id;
                        return (
                            <button
                                key={btn.id}
                                onClick={() => setFilterType(btn.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                                    active
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {btn.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Customers Grid */}
            {filteredCustomers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map((customer) => (
                        <div key={customer.id} className="glass-card p-6 flex flex-col group hover:border-indigo-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                    customer.type === 'private' ? "bg-purple-50 text-purple-500 shadow-purple-500/10" : "bg-emerald-50 text-emerald-500 shadow-emerald-500/10"
                                )}>
                                    {customer.type === 'private' ? <User className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        customer.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                            customer.status === 'inactive' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                "bg-rose-50 text-rose-600 border border-rose-100"
                                    )}>
                                        <div className={cn("h-1.5 w-1.5 rounded-full",
                                            customer.status === 'active' ? "bg-emerald-500 animate-pulse" :
                                                customer.status === 'inactive' ? "bg-amber-500" : "bg-rose-500"
                                        )} />
                                        {customer.status === 'active' ? 'Aktiv' : customer.status === 'inactive' ? 'Inaktiv' : 'Gesperrt'}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditCustomer(customer)}
                                            className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCustomer(customer.id)}
                                            className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                                            customer.type === 'private' ? "bg-purple-100 text-purple-600" : "bg-emerald-100 text-emerald-600"
                                        )}>
                                            {customer.type === 'private' ? "Privat" : "Geschäft"}
                                        </span>
                                        {customer.taxId && (
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {customer.taxId}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                        {customer.name}
                                    </h3>
                                </div>

                                <div className="space-y-2.5 text-sm font-medium text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-slate-300" />
                                        <span className="line-clamp-1">{customer.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-slate-300" />
                                        <span>{customer.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-4 w-4 text-slate-300" />
                                        <span className="line-clamp-1">{customer.address.street}, {customer.address.city}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                        Letzte Aktivität
                                    </span>
                                    <span className="text-xs font-bold text-slate-600">
                                        {customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString('de-DE') : 'Keine'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditCustomer(customer);
                                    }}
                                    className="relative z-10 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all group/btn"
                                >
                                    Details <ExternalLink className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                        <Search className="h-10 w-10 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xl font-bold text-slate-900">Keine Kunden gefunden</h4>
                        <p className="text-slate-500 font-medium">Versuchen Sie es mit einem anderen Suchbegriff oder Filter.</p>
                    </div>
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setFilterType("all");
                        }}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        Alle Filter zurücksetzen
                    </button>
                </div>
            )}

            <CustomerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCustomer}
                initialCustomer={editingCustomer}
            />
        </div>
    );
}
