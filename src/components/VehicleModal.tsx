"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Car,
    FileText,
    Wrench,
    Gauge,
    Calendar,
    User,
    CreditCard,
    Plus,
    Trash2,
    Download,
    Hash,
    Truck,
    Upload
} from "lucide-react";
import { Vehicle, VehicleStatus, VehicleDocument } from "@/types/vehicle";
import { cn } from "@/lib/utils";
import { useRef } from "react";

interface VehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (vehicle: Vehicle) => void;
    initialVehicle?: Vehicle;
}

const TABS = [
    { id: "basic", label: "Basisdaten", icon: Car },
    { id: "fleet", label: "Flotte & Status", icon: Truck },
    { id: "maintenance", label: "Wartung", icon: Wrench },
    { id: "documents", label: "Dokumente", icon: FileText }
];

export function VehicleModal({ isOpen, onClose, onSave, initialVehicle }: VehicleModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("basic");
    const [formData, setFormData] = useState<Vehicle>(() => initialVehicle || {
        id: Math.random().toString(36).substr(2, 9),
        basicInfo: {
            make: "",
            model: "",
            licensePlate: "",
            year: new Date().getFullYear().toString(),
            vin: "",
            color: "",
        },
        fleetDetails: {
            currentMileage: 0,
            status: "Bereit",
        },
        maintenance: {
            nextTUV: "",
            lastService: "",
        },
        documents: [],
        createdAt: new Date().toISOString(),
    });

    useEffect(() => {
        if (initialVehicle) {
            setFormData(initialVehicle);
        } else {
            setFormData({
                id: Math.random().toString(36).substr(2, 9),
                basicInfo: {
                    make: "",
                    model: "",
                    licensePlate: "",
                    year: new Date().getFullYear().toString(),
                    vin: "",
                    color: "",
                },
                fleetDetails: {
                    currentMileage: 0,
                    status: "Bereit",
                },
                maintenance: {
                    nextTUV: "",
                    lastService: "",
                },
                documents: [],
                createdAt: new Date().toISOString(),
            });
        }
    }, [initialVehicle, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const addDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const newDoc: VehicleDocument = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type || "application/octet-stream",
            uploadDate: new Date().toISOString(),
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        };
        setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, newDoc]
        }));

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const removeDocument = (id: string) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter(d => d.id !== id)
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-3xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 font-outfit">
                            {initialVehicle ? "Fahrzeug bearbeiten" : "Neues Fahrzeug"}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">Alle Informationen zum Fahrzeug verwalten.</p>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 border-b border-slate-100 bg-slate-50/50">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm",
                                    active
                                        ? "border-indigo-600 text-indigo-600 bg-white"
                                        : "border-transparent text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                    {activeTab === "basic" && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Hersteller</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.basicInfo.make}
                                    onChange={e => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, make: e.target.value } })}
                                    placeholder="z.B. VW, Mercedes"
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Modell</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.basicInfo.model}
                                    onChange={e => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, model: e.target.value } })}
                                    placeholder="z.B. Transporter, Sprinter"
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    Kennzeichen
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium uppercase"
                                    value={formData.basicInfo.licensePlate}
                                    onChange={e => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, licensePlate: e.target.value } })}
                                    placeholder="B-XY 123"
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Erstzulassung (Jahr)</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.basicInfo.year}
                                    onChange={e => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, year: e.target.value } })}
                                    placeholder="2023"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Hash className="h-3 w-3" /> Fahrgestellnummer (VIN)
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium uppercase"
                                    value={formData.basicInfo.vin}
                                    onChange={e => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, vin: e.target.value } })}
                                    placeholder="WVGZZZ..."
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Farbe</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.basicInfo.color}
                                    onChange={e => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, color: e.target.value } })}
                                    placeholder="Weiß, Blau"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "fleet" && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Status</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                                    value={formData.fleetDetails.status}
                                    onChange={e => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, status: e.target.value as VehicleStatus } })}
                                >
                                    <option value="Bereit">Bereit</option>
                                    <option value="In Benutzung">In Benutzung</option>
                                    <option value="Werkstatt">Werkstatt</option>
                                    <option value="Außer Betrieb">Außer Betrieb</option>
                                </select>
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Gauge className="h-3 w-3" /> Kilometerstand
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.fleetDetails.currentMileage}
                                    onChange={e => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, currentMileage: parseInt(e.target.value) || 0 } })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <User className="h-3 w-3" /> Zugewiesener Mitarbeiter (ID)
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.fleetDetails.assignedEmployeeId || ""}
                                    onChange={e => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, assignedEmployeeId: e.target.value } })}
                                    placeholder="Mitarbeiter ID"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <CreditCard className="h-3 w-3" /> Tankkarten-Nr.
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.fleetDetails.fuelCardNumber || ""}
                                    onChange={e => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, fuelCardNumber: e.target.value } })}
                                    placeholder="Nr. der Tankkarte"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "maintenance" && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Nächster TÜV
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.maintenance.nextTUV}
                                    onChange={e => setFormData({ ...formData, maintenance: { ...formData.maintenance, nextTUV: e.target.value } })}
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Letzter Service
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.maintenance.lastService}
                                    onChange={e => setFormData({ ...formData, maintenance: { ...formData.maintenance, lastService: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Bereifung</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                                    value={formData.maintenance.tireChangeDue || ""}
                                    onChange={e => setFormData({ ...formData, maintenance: { ...formData.maintenance, tireChangeDue: e.target.value as any } })}
                                >
                                    <option value="">Wählen...</option>
                                    <option value="Sommer">Sommer</option>
                                    <option value="Winter">Winter</option>
                                    <option value="Allwetter">Allwetter</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === "documents" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                                <div>
                                    <h4 className="text-indigo-900 font-bold">Dokumente hinterlegen</h4>
                                    <p className="text-indigo-600/70 text-sm font-medium">Fahrzeugschein, Versicherung, Kaufvertrag.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={triggerFileUpload}
                                    className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all border border-indigo-100"
                                >
                                    <Upload className="h-4 w-4" /> Datei wählen
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={addDocument}
                                    className="hidden"
                                />
                            </div>

                            <div className="space-y-3">
                                {formData.documents.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                        <FileText className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 font-medium text-sm">Noch keine Unterlagen hinterlegt.</p>
                                    </div>
                                ) : (
                                    formData.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 font-bold text-sm">{doc.name}</p>
                                                    <p className="text-slate-400 text-xs font-medium">Hochgeladen am {new Date(doc.uploadDate).toLocaleDateString()} • {doc.fileSize}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" className="h-9 w-9 bg-slate-50 text-slate-400 flex items-center justify-center rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDocument(doc.id)}
                                                    className="h-9 w-9 bg-slate-50 text-slate-400 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-all"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="bg-primary-gradient text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        {initialVehicle ? "Speichern" : "Fahrzeug anlegen"}
                    </button>
                </div>
            </div>
        </div>
    );
}
