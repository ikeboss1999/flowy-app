"use client";

import React, { useState, useMemo } from "react";
import {
    Search,
    Plus,
    Wrench,
    Filter,
    MoreHorizontal,
    Edit2,
    Trash2,
    CheckCircle2,
    Briefcase,
    Package,
    Layers
} from "lucide-react";
import { Service } from "@/types/service";
import { ServiceModal } from "@/components/ServiceModal";
import { useServices } from "@/hooks/useServices";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

export default function ServicesPage() {
    const { services, addService, updateService, deleteService, isLoading } = useServices();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);

    const filteredServices = useMemo(() => {
        return services.filter(service => {
            const matchesSearch =
                service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = filterCategory === "all" || service.category === filterCategory;

            return matchesSearch && matchesCategory;
        });
    }, [services, searchQuery, filterCategory]);

    const handleSaveService = (service: Service) => {
        if (editingService) {
            updateService(service.id, service);
        } else {
            addService(service);
        }
    };

    const handleDeleteService = (id: string) => {
        showConfirm({
            title: "Leistung löschen?",
            message: "Möchten Sie diese Leistung wirklich aus dem Katalog entfernen?",
            variant: "danger",
            confirmLabel: "Jetzt löschen",
            onConfirm: () => {
                deleteService(id);
                showToast("Leistung erfolgreich entfernt.", "success");
            }
        });
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
                            <Wrench className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Katalog</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Leistungen <span className="text-slate-300 font-light">Definieren</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Verwalten Sie Ihre Standard-Leistungen, Preise und Materialkataloge.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingService(undefined);
                        setIsModalOpen(true);
                    }}
                    className="bg-primary-gradient text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus className="h-5 w-5" /> Neue Leistung
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: "Gesamt", count: services.length, color: "text-slate-600", bg: "bg-slate-100", icon: Wrench },
                    { label: "Arbeit", count: services.filter(s => s.category === 'Labor').length, color: "text-indigo-600", bg: "bg-indigo-50", icon: Briefcase },
                    { label: "Material", count: services.filter(s => s.category === 'Material').length, color: "text-amber-600", bg: "bg-amber-50", icon: Package },
                    { label: "Pauschalen", count: services.filter(s => s.category === 'FlatRate').length, color: "text-emerald-600", bg: "bg-emerald-50", icon: Layers },
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

            {/* Filters & Search */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Leistungen suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                    />
                </div>

                <div className="bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
                    {[
                        { id: "all", label: "Alle", icon: Filter },
                        { id: "Labor", label: "Arbeit", icon: Briefcase },
                        { id: "Material", label: "Material", icon: Package },
                        { id: "FlatRate", label: "Pauschalen", icon: Layers }
                    ].map((btn) => {
                        const Icon = btn.icon;
                        const active = filterCategory === btn.id;
                        return (
                            <button
                                key={btn.id}
                                onClick={() => setFilterCategory(btn.id)}
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

            {/* Services Grid */}
            {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="glass-card p-6 flex flex-col group hover:border-indigo-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                    service.category === 'Labor' ? "bg-indigo-50 text-indigo-500 shadow-indigo-500/10" :
                                        service.category === 'Material' ? "bg-amber-50 text-amber-500 shadow-amber-500/10" :
                                            "bg-emerald-50 text-emerald-500 shadow-emerald-500/10"
                                )}>
                                    {service.category === 'Labor' ? <Briefcase className="h-6 w-6" /> :
                                        service.category === 'Material' ? <Package className="h-6 w-6" /> :
                                            <Layers className="h-6 w-6" />}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingService(service);
                                            setIsModalOpen(true);
                                        }}
                                        className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2 mb-6">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                    {service.title}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                                    {service.description || "Keine Beschreibung"}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    pro {service.unit === 'pauschal' ? 'PA' : service.unit}
                                </span>
                                <span className="text-2xl font-black text-slate-900">
                                    € {service.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                        <Wrench className="h-10 w-10 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xl font-bold text-slate-900">Keine Leistungen gefunden</h4>
                        <p className="text-slate-500 font-medium">Erstellen Sie Ihre erste Leistung.</p>
                    </div>
                </div>
            )}

            <ServiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveService}
                initialService={editingService}
            />
        </div>
    );
}
