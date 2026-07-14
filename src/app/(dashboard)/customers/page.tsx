"use client";

import React, { useMemo, useState } from "react";
import {
    Briefcase,
    Building2,
    CheckCircle2,
    Copy,
    Edit2,
    ExternalLink,
    Filter,
    Mail,
    MapPin,
    Phone,
    Plus,
    Search,
    ShieldAlert,
    Trash2,
    User,
    Users,
} from "lucide-react";
import { Customer, CustomerType } from "@/types/customer";
import { CustomerModal } from "@/components/CustomerModal";
import { CustomerDetailModal } from "@/components/CustomerDetailModal";
import { useCustomers } from "@/hooks/useCustomers";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

const filterOptions: Array<{ id: CustomerType | "all"; label: string; icon: React.ElementType }> = [
    { id: "all", label: "Alle", icon: Filter },
    { id: "private", label: "Privat", icon: User },
    { id: "business", label: "Geschäft", icon: Briefcase },
];

export default function CustomersPage() {
    usePermissionGuard("customers_read");
    const { customers, addCustomer, updateCustomer, deleteCustomer, isLoading } = useCustomers();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<CustomerType | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [selectedDetailCustomer, setSelectedDetailCustomer] = useState<Customer | undefined>(undefined);

    const stats = useMemo(() => ({
        total: customers.length,
        private: customers.filter(customer => customer.type === "private").length,
        business: customers.filter(customer => customer.type === "business").length,
        active: customers.filter(customer => customer.status === "active").length,
        blocked: customers.filter(customer => customer.status === "blocked").length,
    }), [customers]);

    const filteredCustomers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return customers
            .filter(customer => {
                const matchesSearch =
                    !query ||
                    (customer.name || "").toLowerCase().includes(query) ||
                    (customer.contactPerson || "").toLowerCase().includes(query) ||
                    (customer.email || "").toLowerCase().includes(query) ||
                    (customer.phone || "").toLowerCase().includes(query) ||
                    (customer.customer_number || "").toLowerCase().includes(query) ||
                    (customer.address?.city || "").toLowerCase().includes(query) ||
                    (customer.taxId || "").toLowerCase().includes(query);

                const matchesType = filterType === "all" || customer.type === filterType;

                return matchesSearch && matchesType;
            })
            .sort((a, b) => {
                const numA = a.customer_number || "";
                const numB = b.customer_number || "";
                return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: "base" });
            });
    }, [customers, searchQuery, filterType]);

    const openCreateModal = () => {
        setEditingCustomer(undefined);
        setIsModalOpen(true);
    };

    const handleSaveCustomer = (customer: Customer) => {
        if (editingCustomer) {
            updateCustomer(customer.id, customer);
            if (selectedDetailCustomer?.id === customer.id) {
                setSelectedDetailCustomer(customer);
            }
            showToast("Kunde erfolgreich aktualisiert.", "success");
        } else {
            addCustomer(customer);
            showToast("Kunde erfolgreich angelegt.", "success");
        }
    };

    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleDeleteCustomer = (id: string) => {
        showConfirm({
            title: "Kunden löschen?",
            message: "Möchten Sie diesen Kunden wirklich unwiderruflich löschen?",
            variant: "danger",
            confirmLabel: "Jetzt löschen",
            onConfirm: () => {
                deleteCustomer(id);
                if (selectedDetailCustomer?.id === id) {
                    setSelectedDetailCustomer(undefined);
                }
                showToast("Kunde erfolgreich gelöscht.", "success");
            }
        });
    };

    const handleCopyEmail = (email?: string) => {
        if (!email) return;
        navigator.clipboard.writeText(email);
        showToast("E-Mail-Adresse in die Zwischenablage kopiert.", "success");
    };

    if (isLoading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="rounded-3xl border border-slate-100 bg-white px-6 py-4 font-black text-slate-400 shadow-sm">
                    Kunden werden geladen...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="overflow-hidden rounded-[36px] border border-indigo-100/70 bg-white shadow-sm">
                <div className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                                    <Users className="h-6 w-6 text-cyan-200" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-[0.35em] text-cyan-100">CRM</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Kundenverwaltung</h1>
                            <p className="mt-3 max-w-2xl text-base font-medium text-white/65">
                                Kontakte, Kundennummern, Rechnungsdaten und Geschäftsdetails an einem Ort.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="h-5 w-5" /> Neuer Kunde
                        </button>
                    </div>

                    <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                            { label: "Gesamt", value: stats.total, icon: Users, className: "border-white/10 bg-white/10 text-white" },
                            { label: "Privat", value: stats.private, icon: User, className: "border-purple-300/20 bg-purple-400/10 text-purple-100" },
                            { label: "Geschäft", value: stats.business, icon: Briefcase, className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" },
                            { label: "Aktiv", value: stats.active, icon: CheckCircle2, className: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100" },
                            { label: "Gesperrt", value: stats.blocked, icon: ShieldAlert, className: "border-rose-300/20 bg-rose-400/10 text-rose-100" },
                        ].map(({ label, value, icon: Icon, className }) => (
                            <div key={label} className={cn("rounded-3xl border p-4 backdrop-blur", className)}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                                        <p className="mt-2 text-3xl font-black">{value}</p>
                                    </div>
                                    <Icon className="h-6 w-6 opacity-70" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Name, E-Mail, Telefon, Kundennummer, Ort oder UID suchen..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                            {filterOptions.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setFilterType(id)}
                                    className={cn(
                                        "flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all",
                                        filterType === id
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {filteredCustomers.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    {filteredCustomers.map((customer) => {
                        const isBusiness = customer.type === "business";
                        return (
                            <div
                                key={customer.id}
                                onClick={() => setSelectedDetailCustomer(customer)}
                                className="group cursor-pointer overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
                            >
                                <div className="flex flex-col gap-5 p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 items-start gap-4">
                                            <div className={cn(
                                                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                                                isBusiness
                                                    ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                                                    : "border-purple-100 bg-purple-50 text-purple-600"
                                            )}>
                                                {isBusiness ? <Briefcase className="h-7 w-7" /> : <User className="h-7 w-7" />}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className={cn(
                                                        "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                                                        isBusiness ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
                                                    )}>
                                                        {isBusiness ? "Firma" : "Privat"}
                                                    </span>
                                                    {customer.customer_number && (
                                                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">
                                                            {customer.customer_number}
                                                        </span>
                                                    )}
                                                    {isBusiness && customer.reverseChargeEnabled && (
                                                        <span className="rounded-lg border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">
                                                            Reverse Charge
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="truncate text-2xl font-black leading-tight text-slate-900 transition-colors group-hover:text-indigo-600" title={customer.name}>
                                                    {customer.name}
                                                </h3>
                                                <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-semibold text-slate-500">
                                                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                                                    {[customer.address?.street, `${customer.address?.zip || ""} ${customer.address?.city || ""}`.trim()].filter(Boolean).join(", ") || "Keine Adresse"}
                                                </p>
                                                {isBusiness && customer.contactPerson && (
                                                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-semibold text-slate-500">
                                                        <User className="h-4 w-4 shrink-0 text-slate-400" />
                                                        Ansprechpartner: {customer.contactPerson}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <span className={cn(
                                                "hidden rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider sm:inline-flex",
                                                customer.status === "active" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" :
                                                    customer.status === "inactive" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100" :
                                                    customer.status === "draft" ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200" :
                                                        "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                                            )}>
                                                {customer.status === "active" ? "Aktiv" : customer.status === "inactive" ? "Inaktiv" : customer.status === "draft" ? "Entwurf" : "Gesperrt"}
                                            </span>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleEditCustomer(customer);
                                                }}
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                                title="Bearbeiten"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleDeleteCustomer(customer.id);
                                                }}
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                                title="Löschen"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
                                        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <Mail className="h-3.5 w-3.5" /> E-Mail
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-bold text-slate-700">{customer.email || "-"}</span>
                                                {customer.email && (
                                                    <>
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleCopyEmail(customer.email);
                                                            }}
                                                            className="shrink-0 text-slate-400 hover:text-indigo-600"
                                                            title="E-Mail kopieren"
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </button>
                                                        <a
                                                            href={`mailto:${customer.email}`}
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="shrink-0 text-slate-400 hover:text-indigo-600"
                                                            title="E-Mail schreiben"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <Phone className="h-3.5 w-3.5" /> Telefon
                                            </p>
                                            <span className="truncate text-sm font-bold text-slate-700">{customer.phone || "-"}</span>
                                        </div>

                                        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <Building2 className="h-3.5 w-3.5" /> Steuerdaten
                                            </p>
                                            <span className="truncate text-sm font-bold text-slate-700">{customer.taxId || customer.commercialRegisterNumber || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-[36px] border border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-24 text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-indigo-500 shadow-sm">
                        <Search className="h-10 w-10" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900">Keine Kunden gefunden</h4>
                    <p className="mt-2 max-w-md font-medium text-slate-500">
                        Versuchen Sie einen anderen Suchbegriff oder setzen Sie den Filter zurück.
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setFilterType("all");
                        }}
                        className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-indigo-600 shadow-sm ring-1 ring-indigo-100"
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
                isOpen={!!selectedDetailCustomer}
                onClose={() => setSelectedDetailCustomer(undefined)}
                customer={selectedDetailCustomer}
                onUpdateCustomer={(updatedCustomer) => {
                    updateCustomer(updatedCustomer.id, updatedCustomer);
                    setSelectedDetailCustomer(updatedCustomer);
                }}
            />
        </div>
    );
}
