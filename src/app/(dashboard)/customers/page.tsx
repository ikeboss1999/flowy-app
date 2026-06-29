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
    CheckCircle2,
    Copy
} from "lucide-react";
import { Customer, CustomerType } from "@/types/customer";
import { CustomerModal } from "@/components/CustomerModal";
import { CustomerDetailModal } from "@/components/CustomerDetailModal";
import { useCustomers } from "@/hooks/useCustomers";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

export default function CustomersPage() {
    usePermissionGuard("customers_read");
    const { customers, addCustomer, updateCustomer, deleteCustomer, isLoading } = useCustomers();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<CustomerType | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDetailCustomer, setSelectedDetailCustomer] = useState<Customer | undefined>(undefined);

    const handleOpenDetail = (customer: Customer) => {
        setSelectedDetailCustomer(customer);
        setIsDetailModalOpen(true);
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            const matchesSearch =
                (customer.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (customer.email || "").toLowerCase().includes(searchQuery.toLowerCase());

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
        showConfirm({
            title: "Kunden löschen?",
            message: "Möchten Sie diesen Kunden wirklich unwiderruflich löschen?",
            variant: "danger",
            confirmLabel: "Jetzt löschen",
            onConfirm: () => {
                deleteCustomer(id);
                showToast("Kunde erfolgreich gelöscht.", "success");
            }
        });
    };

    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCopyEmail = (email: string) => {
        navigator.clipboard.writeText(email);
        showToast("E-Mail Adresse in die Zwischenablage kopiert.", "success");
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

            {/* Customers List */}
            {filteredCustomers.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {filteredCustomers.map((customer) => (
                        <div 
                            key={customer.id} 
                            onClick={() => handleOpenDetail(customer)}
                            className="glass-card p-6 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 group hover:border-indigo-500/30 hover:shadow-md transition-all duration-300 cursor-pointer"
                        >
                            {/* Spalte 1: Name, Typ & UID/FN (col-span-3) */}
                            <div className="lg:col-span-3 flex items-center gap-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105",
                                    customer.type === 'private' 
                                        ? "bg-purple-50/70 border-purple-100 text-purple-500" 
                                        : "bg-emerald-50/70 border-emerald-100 text-emerald-500"
                                )}>
                                    {customer.type === 'private' ? <User className="h-5.5 w-5.5" /> : <Briefcase className="h-5.5 w-5.5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-extrabold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors truncate">
                                            {customer.name}
                                        </h3>
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0",
                                            customer.type === 'private' ? "bg-purple-100 text-purple-600" : "bg-emerald-100 text-emerald-600"
                                        )}>
                                            {customer.type === 'private' ? "Privat" : "Firma"}
                                        </span>
                                    </div>
                                    {(customer.taxId || customer.commercialRegisterNumber) && (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                            {customer.taxId && (
                                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                    UID: {customer.taxId}
                                                </span>
                                            )}
                                            {customer.commercialRegisterNumber && (
                                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                    FN: {customer.commercialRegisterNumber}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Spalte 2: E-Mail (col-span-3) */}
                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-2 min-w-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Mail className="h-4.5 w-4.5 text-slate-300 shrink-0" />
                                    <span className="truncate text-slate-600 font-semibold text-sm">{customer.email}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyEmail(customer.email);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50/50 transition-colors"
                                        title="Email kopieren"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                    <a
                                        href={`mailto:${customer.email}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50/50 transition-colors"
                                        title="E-Mail schreiben"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            </div>

                            {/* Spalte 3: Telefon (col-span-2) */}
                            <div className="lg:col-span-2 flex items-center gap-2.5 min-w-0">
                                <Phone className="h-4.5 w-4.5 text-slate-300 shrink-0" />
                                <span className="truncate text-slate-600 font-semibold text-sm">{customer.phone || "-"}</span>
                            </div>

                            {/* Spalte 4: Ort/Adresse (col-span-2) */}
                            <div className="lg:col-span-2 flex items-center gap-2.5 min-w-0">
                                <MapPin className="h-4.5 w-4.5 text-slate-300 shrink-0" />
                                <span className="truncate text-slate-600 font-semibold text-sm" title={customer.address.street}>
                                    {customer.address.city}
                                </span>
                            </div>

                            {/* Spalte 5: Status & Aktionen (col-span-2 / justify-end) */}
                            <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-4 lg:pt-0 border-t border-slate-50 lg:border-none">
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-wider shrink-0",
                                    customer.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                        customer.status === 'inactive' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                            "bg-rose-50 text-rose-600 border border-rose-100"
                                )}>
                                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0",
                                        customer.status === 'active' ? "bg-emerald-500 animate-pulse" :
                                            customer.status === 'inactive' ? "bg-amber-500" : "bg-rose-500"
                                    )} />
                                    {customer.status === 'active' ? 'Aktiv' : customer.status === 'inactive' ? 'Inaktiv' : 'Gesperrt'}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditCustomer(customer);
                                        }}
                                        className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                        title="Bearbeiten"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCustomer(customer.id);
                                        }}
                                        className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                        title="Löschen"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
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
                existingCustomers={customers}
            />

            <CustomerDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedDetailCustomer(undefined);
                }}
                customer={selectedDetailCustomer}
                onUpdateCustomer={(updatedCustomer) => {
                    updateCustomer(updatedCustomer.id, updatedCustomer);
                    setSelectedDetailCustomer(updatedCustomer);
                }}
            />
        </div>
    );
}
