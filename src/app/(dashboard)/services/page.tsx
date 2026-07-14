"use client";

import React, { useMemo, useState } from "react";
import {
    Briefcase,
    Edit2,
    Filter,
    Layers,
    Package,
    Plus,
    Search,
    Trash2,
    Wrench,
} from "lucide-react";
import { Service } from "@/types/service";
import { ServiceModal } from "@/components/ServiceModal";
import { useServices } from "@/hooks/useServices";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

const categoryOptions = [
    { id: "all", label: "Alle", icon: Filter },
    { id: "Labor", label: "Arbeit", icon: Briefcase },
    { id: "Material", label: "Material", icon: Package },
    { id: "FlatRate", label: "Pauschalen", icon: Layers },
];

function categoryMeta(category?: Service["category"]) {
    switch (category) {
        case "Material":
            return { label: "Material", icon: Package, badge: "bg-amber-50 text-amber-700 ring-amber-100", iconBox: "bg-amber-50 text-amber-600" };
        case "FlatRate":
            return { label: "Pauschale", icon: Layers, badge: "bg-emerald-50 text-emerald-700 ring-emerald-100", iconBox: "bg-emerald-50 text-emerald-600" };
        case "Labor":
        default:
            return { label: "Arbeit", icon: Briefcase, badge: "bg-indigo-50 text-indigo-700 ring-indigo-100", iconBox: "bg-indigo-50 text-indigo-600" };
    }
}

export default function ServicesPage() {
    usePermissionGuard(["invoices_write", "offers_write"]);
    const { services, addService, updateService, deleteService, isLoading } = useServices();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | undefined>(undefined);

    const catalogServices = useMemo(() => services.filter(service => service.category !== "Position"), [services]);

    const stats = useMemo(() => ({
        total: catalogServices.length,
        labor: catalogServices.filter(service => service.category === "Labor").length,
        material: catalogServices.filter(service => service.category === "Material").length,
        flatRate: catalogServices.filter(service => service.category === "FlatRate").length,
    }), [catalogServices]);

    const filteredServices = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return catalogServices
            .filter(service => {
                const matchesSearch =
                    !query ||
                    service.title.toLowerCase().includes(query) ||
                    (service.description || "").toLowerCase().includes(query) ||
                    (service.unit || "").toLowerCase().includes(query);

                const matchesCategory = filterCategory === "all" || service.category === filterCategory;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
    }, [catalogServices, searchQuery, filterCategory]);

    const openCreateModal = () => {
        setEditingService(undefined);
        setIsModalOpen(true);
    };

    const handleSaveService = (service: Service) => {
        const nextService = service.category === "Position" ? { ...service, category: "Labor" as const } : service;
        if (editingService) {
            updateService(nextService.id, nextService);
            showToast("Leistung erfolgreich aktualisiert.", "success");
        } else {
            addService(nextService);
            showToast("Leistung erfolgreich erstellt.", "success");
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
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="rounded-3xl border border-slate-100 bg-white px-6 py-4 font-black text-slate-400 shadow-sm">
                    Katalog wird geladen...
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
                                    <Wrench className="h-6 w-6 text-cyan-200" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-[0.35em] text-cyan-100">Katalog</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Leistungen</h1>
                            <p className="mt-3 max-w-2xl text-base font-medium text-white/65">
                                Standard-Leistungen, Materialpreise und Pauschalen sauber für Angebote und Rechnungen vorbereiten.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="h-5 w-5" /> Neue Leistung
                        </button>
                    </div>

                    <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            { label: "Gesamt", value: stats.total, icon: Wrench, className: "border-white/10 bg-white/10 text-white" },
                            { label: "Arbeit", value: stats.labor, icon: Briefcase, className: "border-indigo-300/20 bg-indigo-400/10 text-indigo-100" },
                            { label: "Material", value: stats.material, icon: Package, className: "border-amber-300/20 bg-amber-400/10 text-amber-100" },
                            { label: "Pauschalen", value: stats.flatRate, icon: Layers, className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" },
                        ].map(({ label, value, icon: Icon, className }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => {
                                    if (label === "Gesamt") setFilterCategory("all");
                                    if (label === "Arbeit") setFilterCategory("Labor");
                                    if (label === "Material") setFilterCategory("Material");
                                    if (label === "Pauschalen") setFilterCategory("FlatRate");
                                }}
                                className={cn("rounded-3xl border p-4 text-left backdrop-blur transition-all hover:-translate-y-0.5", className)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                                        <p className="mt-2 text-3xl font-black">{value}</p>
                                    </div>
                                    <Icon className="h-6 w-6 opacity-70" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Leistung, Beschreibung oder Einheit suchen..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                            {categoryOptions.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setFilterCategory(id)}
                                    className={cn(
                                        "flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all",
                                        filterCategory === id
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

            {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 2xl:gap-5">
                    {filteredServices.map(service => {
                        const meta = categoryMeta(service.category);
                        const Icon = meta.icon;

                        return (
                            <div
                                key={service.id}
                                className="group overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg 2xl:rounded-[32px]"
                            >
                                <div className="flex h-full flex-col p-4 2xl:p-6">
                                    <div className="mb-4 flex items-start justify-between gap-3 2xl:mb-5 2xl:gap-4">
                                        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl 2xl:h-14 2xl:w-14", meta.iconBox)}>
                                            <Icon className="h-5 w-5 2xl:h-7 2xl:w-7" />
                                        </div>
                                        <div className="flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                            <button
                                                onClick={() => {
                                                    setEditingService(service);
                                                    setIsModalOpen(true);
                                                }}
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                                title="Bearbeiten"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteService(service.id)}
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                                title="Löschen"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="min-h-[88px] flex-1 2xl:min-h-[120px]">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1", meta.badge)}>
                                                {meta.label}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                {service.unit}
                                            </span>
                                        </div>
                                        <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-900 transition-colors group-hover:text-indigo-600 2xl:text-2xl">
                                            {service.title}
                                        </h3>
                                        <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500 2xl:mt-3 2xl:line-clamp-3">
                                            {service.description || "Keine Beschreibung hinterlegt."}
                                        </p>
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 2xl:mt-6 2xl:rounded-3xl 2xl:p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nettopreis</p>
                                        <div className="mt-1 flex items-end justify-between gap-3">
                                            <span className="text-2xl font-black text-slate-900 2xl:text-3xl">
                                                € {(service.price || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="pb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                                pro {service.unit}
                                            </span>
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
                        <Wrench className="h-10 w-10" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900">Keine Leistungen gefunden</h4>
                    <p className="mt-2 max-w-md font-medium text-slate-500">
                        Erstellen Sie Ihre erste Leistung oder passen Sie Suche und Filter an.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-indigo-600 shadow-sm ring-1 ring-indigo-100"
                    >
                        Leistung erstellen
                    </button>
                </div>
            )}

            <ServiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveService}
                initialService={editingService}
                mode="service"
            />
        </div>
    );
}
