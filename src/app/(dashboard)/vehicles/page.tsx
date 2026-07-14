"use client";

import React, { useMemo, useState } from "react";
import {
    AlertCircle,
    Calendar,
    Car,
    CheckCircle2,
    ChevronRight,
    Edit2,
    FileText,
    Gauge,
    Plus,
    Search,
    Trash2,
    User,
    Wrench,
    X,
} from "lucide-react";
import { Vehicle, VehicleStatus } from "@/types/vehicle";
import { VehicleModal } from "@/components/VehicleModal";
import { useVehicles } from "@/hooks/useVehicles";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

type ActiveVehicleStatus = "Bereit" | "In Benutzung" | "Werkstatt" | "Außer Betrieb";

const normalizeStatus = (status: VehicleStatus): ActiveVehicleStatus =>
    status === "AuÃŸer Betrieb" ? "Außer Betrieb" : status;

const statusConfig: Record<ActiveVehicleStatus, { color: string; bg: string; border: string; icon: React.ElementType }> = {
    Bereit: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", icon: CheckCircle2 },
    "In Benutzung": { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", icon: User },
    Werkstatt: { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", icon: Wrench },
    "Außer Betrieb": { color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", icon: AlertCircle },
};

const formatDate = (date?: string) => {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("de-AT");
};

const vehicleTitle = (vehicle: Vehicle) =>
    `${vehicle.basicInfo.make || "Fahrzeug"} ${vehicle.basicInfo.model || ""}`.trim();

export default function VehiclesPage() {
    usePermissionGuard("vehicles_use");

    const { vehicles, addVehicle, updateVehicle, deleteVehicle, isLoading } = useVehicles();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<ActiveVehicleStatus | "Alle">("Alle");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    const stats = useMemo(() => {
        const normalized = vehicles.map((vehicle) => normalizeStatus(vehicle.fleetDetails.status));
        return {
            total: vehicles.length,
            ready: normalized.filter((status) => status === "Bereit").length,
            inUse: normalized.filter((status) => status === "In Benutzung").length,
            workshop: normalized.filter((status) => status === "Werkstatt").length,
            docs: vehicles.reduce((sum, vehicle) => sum + (vehicle.documents?.length || 0), 0),
        };
    }, [vehicles]);

    const filteredVehicles = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return vehicles.filter((vehicle) => {
            const status = normalizeStatus(vehicle.fleetDetails.status);
            const matchesSearch =
                !query ||
                vehicleTitle(vehicle).toLowerCase().includes(query) ||
                vehicle.basicInfo.licensePlate?.toLowerCase().includes(query) ||
                vehicle.basicInfo.vin?.toLowerCase().includes(query) ||
                vehicle.fleetDetails.assignedEmployeeId?.toLowerCase().includes(query);
            const matchesStatus = statusFilter === "Alle" || status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [vehicles, searchQuery, statusFilter]);

    const activeSelectedVehicle = useMemo(() => {
        if (!selectedVehicle) return null;
        return vehicles.find((vehicle) => vehicle.id === selectedVehicle.id) || null;
    }, [selectedVehicle, vehicles]);

    const handleSaveVehicle = (vehicle: Vehicle) => {
        const normalizedVehicle: Vehicle = {
            ...vehicle,
            fleetDetails: {
                ...vehicle.fleetDetails,
                status: normalizeStatus(vehicle.fleetDetails.status),
            },
        };

        if (editingVehicle) {
            updateVehicle(vehicle.id, normalizedVehicle);
            showToast("Fahrzeug wurde gespeichert.", "success");
        } else {
            addVehicle(normalizedVehicle);
            showToast("Fahrzeug wurde angelegt.", "success");
        }
        setIsModalOpen(false);
        setEditingVehicle(undefined);
    };

    const handleDeleteVehicle = (id: string) => {
        showConfirm({
            title: "Fahrzeug löschen?",
            message: "Möchten Sie dieses Fahrzeug wirklich unwiderruflich aus dem Fuhrpark löschen?",
            variant: "danger",
            confirmLabel: "Jetzt löschen",
            onConfirm: () => {
                deleteVehicle(id);
                setSelectedVehicle(null);
                showToast("Fahrzeug erfolgreich gelöscht.", "success");
            },
        });
    };

    const handleEditVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(null);
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-sm font-black text-slate-500 shadow-sm">
                    Fahrzeuge werden geladen...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-2 ring-1 ring-white/20">
                            <Car className="h-5 w-5 text-cyan-100" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100">Fuhrpark</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Fahrzeuge</h1>
                        <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-white/75">
                            Unternehmensflotte, Wartung, Dokumente und Fahrzeugstatus an einem Ort.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setEditingVehicle(undefined);
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-xl shadow-indigo-950/20 transition hover:-translate-y-0.5"
                    >
                        <Plus className="h-5 w-5" />
                        Fahrzeug hinzufügen
                    </button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                    { label: "Gesamt", value: stats.total, icon: Car, tone: "slate" },
                    { label: "Bereit", value: stats.ready, icon: CheckCircle2, tone: "emerald" },
                    { label: "In Benutzung", value: stats.inUse, icon: User, tone: "amber" },
                    { label: "Werkstatt", value: stats.workshop, icon: Wrench, tone: "rose" },
                    { label: "Dokumente", value: stats.docs, icon: FileText, tone: "indigo" },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                                    stat.tone === "slate" && "bg-slate-100 text-slate-600",
                                    stat.tone === "emerald" && "bg-emerald-50 text-emerald-600",
                                    stat.tone === "amber" && "bg-amber-50 text-amber-600",
                                    stat.tone === "rose" && "bg-rose-50 text-rose-600",
                                    stat.tone === "indigo" && "bg-indigo-50 text-indigo-600"
                                )}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <span className="text-3xl font-black text-slate-950">{stat.value}</span>
                            </div>
                            <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                        </div>
                    );
                })}
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Nach Fahrzeug, Kennzeichen, VIN oder Fahrer suchen..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
                        {(["Alle", "Bereit", "In Benutzung", "Werkstatt", "Außer Betrieb"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "rounded-xl px-4 py-3 text-xs font-black transition",
                                    statusFilter === status ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {filteredVehicles.length > 0 ? (
                <section className="grid gap-4">
                    {filteredVehicles.map((vehicle) => {
                        const status = normalizeStatus(vehicle.fleetDetails.status);
                        const config = statusConfig[status];
                        const StatusIcon = config.icon;

                        return (
                            <article
                                key={vehicle.id}
                                onClick={() => setSelectedVehicle(vehicle)}
                                className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70"
                            >
                                <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr_0.9fr_1fr_auto] xl:items-center">
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                            <Car className="h-8 w-8" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", config.bg, config.color, config.border)}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {status}
                                                </span>
                                            </div>
                                            <h3 className="truncate text-xl font-black text-slate-950 group-hover:text-indigo-700">{vehicleTitle(vehicle)}</h3>
                                            <p className="mt-1 font-mono text-sm font-black tracking-wider text-slate-500">{vehicle.basicInfo.licensePlate || "Kein Kennzeichen"}</p>
                                        </div>
                                    </div>

                                    <InfoBlock icon={Gauge} label="Kilometerstand" value={`${vehicle.fleetDetails.currentMileage.toLocaleString("de-AT")} km`} />
                                    <InfoBlock icon={Calendar} label="Nächster TÜV" value={formatDate(vehicle.maintenance.nextTUV)} />
                                    <InfoBlock icon={User} label="Fahrer" value={vehicle.fleetDetails.assignedEmployeeId || "Nicht zugewiesen"} />

                                    <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                                        <button
                                            onClick={() => handleEditVehicle(vehicle)}
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                                            title="Bearbeiten"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteVehicle(vehicle.id)}
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                            title="Löschen"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <ChevronRight className="hidden h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500 xl:block" />
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            ) : (
                <section className="rounded-[32px] border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                        <Car className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-950">Keine Fahrzeuge gefunden</h3>
                    <p className="mt-2 font-semibold text-slate-500">Passe Suche oder Statusfilter an.</p>
                </section>
            )}

            <VehicleModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingVehicle(undefined);
                }}
                onSave={handleSaveVehicle}
                initialVehicle={editingVehicle}
            />

            {activeSelectedVehicle && (
                <VehicleDetailModal
                    vehicle={activeSelectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                    onEdit={() => handleEditVehicle(activeSelectedVehicle)}
                    onDelete={() => handleDeleteVehicle(activeSelectedVehicle.id)}
                />
            )}
        </div>
    );
}

function InfoBlock({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Icon className="h-4 w-4 text-slate-300" />
                {label}
            </p>
            <p className="mt-1 truncate font-black text-slate-900">{value}</p>
        </div>
    );
}

function VehicleDetailModal({
    vehicle,
    onClose,
    onEdit,
    onDelete,
}: {
    vehicle: Vehicle;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const status = normalizeStatus(vehicle.fleetDetails.status);
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-white/30 p-4">
            <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] border border-white/20 bg-white shadow-2xl">
                <aside className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
                    <div className="absolute right-6 top-6 z-10">
                        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/75 transition hover:bg-white/15 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="relative flex flex-col gap-6 pr-14 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-white text-indigo-700 shadow-xl">
                                <Car className="h-12 w-12" />
                            </div>
                            <div className="min-w-0">
                                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", config.bg, config.color, config.border)}>
                                    <StatusIcon className="h-3.5 w-3.5" />
                                    {status}
                                </span>
                                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.3em] text-white/45">Fahrzeugakte</p>
                                <h3 className="mt-2 max-w-3xl break-words text-4xl font-black leading-tight tracking-tight">{vehicleTitle(vehicle)}</h3>
                                <p className="mt-2 font-mono text-lg font-black tracking-wider text-white/75">{vehicle.basicInfo.licensePlate || "Kein Kennzeichen"}</p>
                                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-white/70">
                                    <SideRow icon={Gauge} label={`${vehicle.fleetDetails.currentMileage.toLocaleString("de-AT")} km`} />
                                    <SideRow icon={Calendar} label={`TÜV: ${formatDate(vehicle.maintenance.nextTUV)}`} />
                                    <SideRow icon={User} label={vehicle.fleetDetails.assignedEmployeeId || "Nicht zugewiesen"} />
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button onClick={onEdit} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:bg-indigo-50">
                                <Edit2 className="h-4 w-4" />
                                Bearbeiten
                            </button>
                            <button onClick={onDelete} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200/20 bg-white/10 px-5 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/20">
                                <Trash2 className="h-4 w-4" />
                                Löschen
                            </button>
                        </div>
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    <header className="hidden">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Fahrzeug Details</p>
                            <h3 className="mt-1 text-2xl font-black text-slate-950">{vehicleTitle(vehicle)}</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onEdit} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100">
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={onDelete} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100">
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-6 sm:p-8">
                        <div className="grid gap-4 xl:grid-cols-2">
                            <DetailCard icon={Car} title="Basisdaten">
                                <DetailRow label="Hersteller" value={vehicle.basicInfo.make || "-"} />
                                <DetailRow label="Modell" value={vehicle.basicInfo.model || "-"} />
                                <DetailRow label="Kennzeichen" value={vehicle.basicInfo.licensePlate || "-"} mono />
                                <DetailRow label="Baujahr" value={vehicle.basicInfo.year || "-"} />
                                <DetailRow label="VIN" value={vehicle.basicInfo.vin || "-"} mono />
                                <DetailRow label="Farbe" value={vehicle.basicInfo.color || "-"} />
                            </DetailCard>

                            <DetailCard icon={Wrench} title="Wartung & Betrieb">
                                <DetailRow label="Status" value={status} />
                                <DetailRow label="Kilometerstand" value={`${vehicle.fleetDetails.currentMileage.toLocaleString("de-AT")} km`} />
                                <DetailRow label="Nächster TÜV" value={formatDate(vehicle.maintenance.nextTUV)} />
                                <DetailRow label="Letzter Service" value={formatDate(vehicle.maintenance.lastService)} />
                                <DetailRow label="Bereifung" value={vehicle.maintenance.tireChangeDue || "-"} />
                                <DetailRow label="Tankkarte" value={vehicle.fleetDetails.fuelCardNumber || "-"} mono />
                            </DetailCard>
                        </div>

                        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-950">Dokumente</h4>
                                    <p className="text-sm font-semibold text-slate-500">{vehicle.documents?.length || 0} Dateien hinterlegt</p>
                                </div>
                            </div>
                            {vehicle.documents?.length ? (
                                <div className="grid gap-2">
                                    {vehicle.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-black text-slate-900">{doc.name}</p>
                                                <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(doc.uploadDate)} · {doc.fileSize || "-"}</p>
                                            </div>
                                            {doc.content && (
                                                <a
                                                    href={doc.content}
                                                    download={doc.name}
                                                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                                                >
                                                    Download
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                                    Noch keine Dokumente hinterlegt.
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function SideRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div className="flex min-w-0 items-center gap-3 text-sm font-bold text-white/80">
            <Icon className="h-4 w-4 shrink-0 text-cyan-100" />
            <span className="truncate">{label}</span>
        </div>
    );
}

function DetailCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-black text-slate-950">{title}</h4>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            <span className={cn("max-w-[60%] text-right text-sm font-black text-slate-800", mono && "font-mono text-xs")}>{value}</span>
        </div>
    );
}
