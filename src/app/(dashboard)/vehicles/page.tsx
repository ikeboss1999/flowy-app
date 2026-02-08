"use client";

import React, { useState, useMemo } from "react";
import {
    Search,
    Plus,
    Filter,
    Car,
    MoreHorizontal,
    Edit2,
    Trash2,
    Gauge,
    Calendar,
    User,
    AlertCircle,
    CheckCircle2,
    Wrench,
    Clock
} from "lucide-react";
import { Vehicle, VehicleStatus } from "@/types/vehicle";
import { VehicleModal } from "@/components/VehicleModal";
import { useVehicles } from "@/hooks/useVehicles";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

const MOCK_VEHICLES: Vehicle[] = [];

export default function VehiclesPage() {
    const { vehicles, addVehicle, updateVehicle, deleteVehicle, isLoading: hookLoading } = useVehicles();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<VehicleStatus | "Alle">("Alle");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            const matchesSearch =
                `${vehicle.basicInfo.make} ${vehicle.basicInfo.model}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                vehicle.basicInfo.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === "Alle" || vehicle.fleetDetails.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [vehicles, searchQuery, statusFilter]);

    const handleSaveVehicle = (vehicle: Vehicle) => {
        if (editingVehicle) {
            updateVehicle(vehicle.id, vehicle);
        } else {
            addVehicle(vehicle);
        }
        setIsModalOpen(false);
    };

    const handleDeleteVehicle = (id: string) => {
        showConfirm({
            title: "Fahrzeug löschen?",
            message: "Möchten Sie dieses Fahrzeug wirklich unwiderruflich aus dem Fuhrpark löschen?",
            variant: "danger",
            confirmLabel: "Jetzt löschen",
            onConfirm: () => {
                deleteVehicle(id);
                showToast("Fahrzeug erfolgreich gelöscht.", "success");
            }
        });
    };

    const handleEditVehicle = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const getStatusStyles = (status: VehicleStatus) => {
        switch (status) {
            case "Bereit":
                return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "In Benutzung":
                return "bg-amber-50 text-amber-600 border-amber-100";
            case "Werkstatt":
                return "bg-rose-50 text-rose-600 border-rose-100";
            case "Außer Betrieb":
                return "bg-slate-100 text-slate-500 border-slate-200";
            default:
                return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const getStatusIcon = (status: VehicleStatus) => {
        switch (status) {
            case "Bereit":
                return <CheckCircle2 className="h-3.5 w-3.5" />;
            case "In Benutzung":
                return <Clock className="h-3.5 w-3.5" />;
            case "Werkstatt":
                return <Wrench className="h-3.5 w-3.5" />;
            case "Außer Betrieb":
                return <AlertCircle className="h-3.5 w-3.5" />;
            default:
                return null;
        }
    };

    return (
        <div className="p-10 animate-in fade-in duration-500 space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Car className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Fuhrpark</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Fahrzeuge <span className="text-slate-300 font-light">Managen</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Verwalten Sie Ihre gesamte Unternehmensflotte an einem Ort.</p>
                </div>

                <button
                    onClick={() => {
                        setEditingVehicle(undefined);
                        setIsModalOpen(true);
                    }}
                    className="bg-primary-gradient text-white px-8 py-4 rounded-[20px] font-bold shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <Plus className="h-5 w-5" /> Fahrzeug hinzufügen
                </button>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                <div className="lg:col-span-8 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Nach Modell oder Kennzeichen suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 shadow-sm"
                    />
                </div>
                <div className="lg:col-span-4 flex gap-3">
                    <div className="relative flex-1">
                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[24px] outline-none appearance-none font-bold text-slate-600 shadow-sm transition-all focus:border-indigo-500"
                        >
                            <option value="Alle">Alle Status</option>
                            <option value="Bereit">Bereit</option>
                            <option value="In Benutzung">In Benutzung</option>
                            <option value="Werkstatt">Werkstatt</option>
                            <option value="Außer Betrieb">Außer Betrieb</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Gesamt", count: vehicles.length, color: "text-slate-600", bg: "bg-slate-100" },
                    { label: "Bereit", count: vehicles.filter(v => v.fleetDetails.status === "Bereit").length, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "In Benutzung", count: vehicles.filter(v => v.fleetDetails.status === "In Benutzung").length, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Wartung", count: vehicles.filter(v => v.fleetDetails.status === "Werkstatt").length, color: "text-rose-600", bg: "bg-rose-50" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</span>
                        <span className={cn("font-black text-3xl px-4 py-2 rounded-2xl", stat.color, stat.bg)}>{stat.count}</span>
                    </div>
                ))}
            </div>

            {/* Vehicles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                {filteredVehicles.map((vehicle) => (
                    <div
                        key={vehicle.id}
                        className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 group overflow-hidden flex flex-col"
                    >
                        {/* Status Heading */}
                        <div className="px-6 pt-6 flex justify-between items-start">
                            <div className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                getStatusStyles(vehicle.fleetDetails.status)
                            )}>
                                {getStatusIcon(vehicle.fleetDetails.status)}
                                {vehicle.fleetDetails.status}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditVehicle(vehicle)}
                                    className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteVehicle(vehicle.id)}
                                    className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div className="px-6 py-4 flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                                    <Car className="h-7 w-7" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                                        {vehicle.basicInfo.make} {vehicle.basicInfo.model}
                                    </h3>
                                    <p className="text-slate-400 font-mono text-sm tracking-tight">{vehicle.basicInfo.licensePlate}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-slate-50 p-3 rounded-2xl space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                        <Gauge className="h-3 w-3" /> Stand
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs">{vehicle.fleetDetails.currentMileage.toLocaleString()} km</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" /> TÜV fällig
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs">{vehicle.maintenance.nextTUV}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                                <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="text-xs">
                                    <p className="text-slate-400 font-bold uppercase tracking-tight text-[9px]">Fahrer</p>
                                    <p className="text-slate-700 font-bold">{vehicle.fleetDetails.assignedEmployeeId || "Nicht zugewiesen"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="px-6 py-4 bg-slate-50/50 group-hover:bg-indigo-50/30 transition-colors flex justify-end">
                            <button
                                onClick={() => handleEditVehicle(vehicle)}
                                className="text-indigo-600 font-bold text-sm flex items-center gap-2"
                            >
                                Details anzeigen
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredVehicles.length === 0 && (
                    <div className="col-span-full py-20 bg-white rounded-[32px] border border-slate-100 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                            <Car className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Keine Fahrzeuge gefunden</h3>
                        <p className="text-slate-400 font-medium">Versuchen Sie Ihre Suche oder Filter anzupassen.</p>
                    </div>
                )}
            </div>

            <VehicleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveVehicle}
                initialVehicle={editingVehicle}
            />
        </div>
    );
}
