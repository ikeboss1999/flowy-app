"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    Car,
    Download,
    FileText,
    Trash2,
    Truck,
    Upload,
    Wrench,
    X,
} from "lucide-react";
import { Vehicle, VehicleDocument, VehicleStatus } from "@/types/vehicle";
import { cn } from "@/lib/utils";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

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
    { id: "documents", label: "Dokumente", icon: FileText },
];

const VEHICLE_MAKES = [
    "Mercedes-Benz",
    "Volkswagen",
    "Ford",
    "Renault",
    "Citroën",
    "Peugeot",
    "Fiat",
    "Iveco",
    "Opel",
    "Toyota",
    "Nissan",
    "MAN",
    "Scania",
    "Volvo",
    "Sonstige",
];

const normalizeStatus = (status: VehicleStatus): "Bereit" | "In Benutzung" | "Werkstatt" | "Außer Betrieb" =>
    status === "AuÃŸer Betrieb" ? "Außer Betrieb" : status;

const fieldClass =
    "h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

const emptyVehicle = (): Vehicle => ({
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

export function VehicleModal({ isOpen, onClose, onSave, initialVehicle }: VehicleModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("basic");
    const [isOtherMake, setIsOtherMake] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<VehicleDocument | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [formData, setFormData] = useState<Vehicle>(() => initialVehicle || emptyVehicle());

    useEffect(() => {
        if (initialVehicle) {
            setFormData({
                ...initialVehicle,
                fleetDetails: {
                    ...initialVehicle.fleetDetails,
                    status: normalizeStatus(initialVehicle.fleetDetails.status),
                },
            });
            setIsOtherMake(!!initialVehicle.basicInfo.make && !VEHICLE_MAKES.includes(initialVehicle.basicInfo.make));
        } else {
            setFormData(emptyVehicle());
            setIsOtherMake(false);
        }
        setActiveTab("basic");
    }, [initialVehicle, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (event?: React.FormEvent) => {
        event?.preventDefault();
        onSave({
            ...formData,
            fleetDetails: {
                ...formData.fleetDetails,
                status: normalizeStatus(formData.fleetDetails.status),
            },
        });
        onClose();
    };

    const handleMakeChange = (value: string) => {
        if (value === "Sonstige") {
            setIsOtherMake(true);
            setFormData({ ...formData, basicInfo: { ...formData.basicInfo, make: "" } });
            return;
        }

        setIsOtherMake(false);
        setFormData({ ...formData, basicInfo: { ...formData.basicInfo, make: value } });
    };

    const addDocument = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const newDoc: VehicleDocument = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type || "application/octet-stream",
                uploadDate: new Date().toISOString(),
                fileSize: file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(file.size / 1024).toFixed(0)} KB`,
                content: base64,
            };

            setFormData((prev) => ({
                ...prev,
                documents: [...prev.documents, newDoc],
            }));
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeDocument = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== id),
        }));
    };

    const title = `${formData.basicInfo.make || "Neues"} ${formData.basicInfo.model || "Fahrzeug"}`.trim();

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-white/30 p-4">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[36px] border border-white/20 bg-white shadow-2xl">
                <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-6 text-white xl:px-8">
                    <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
                    <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
                    <div className="relative flex items-center justify-between gap-5">
                        <div className="flex min-w-0 items-center gap-5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-sm">
                                <Car className="h-8 w-8" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100">Fahrzeugakte</p>
                                <h2 className="mt-1 truncate text-3xl font-black text-white">
                                    {initialVehicle ? "Fahrzeug bearbeiten" : "Neues Fahrzeug"}
                                </h2>
                                <p className="mt-1 truncate text-sm font-bold text-white/70">{title}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/12 text-white transition hover:bg-white/20"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                    <aside className="w-full border-r border-slate-100 bg-slate-50 md:w-72">
                        <div className="flex w-full gap-2 overflow-x-auto p-3 md:flex-col md:p-5">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex min-h-14 items-center gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-black transition md:whitespace-normal",
                                            active
                                                ? "border-indigo-100 bg-white text-indigo-600 shadow-sm"
                                                : "border-transparent text-slate-500 hover:bg-white/80 hover:text-slate-800"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 shrink-0", active ? "text-indigo-600" : "text-slate-300")} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/50 p-4 xl:p-8">
                            {activeTab === "basic" && (
                                <FormSection icon={Car} title="Basisdaten" subtitle="Hersteller, Modell, Kennzeichen und Identifikationsdaten.">
                                    <Field label="Hersteller" className="md:col-span-1">
                                        <select
                                            className={fieldClass}
                                            value={isOtherMake ? "Sonstige" : formData.basicInfo.make}
                                            onChange={(event) => handleMakeChange(event.target.value)}
                                            required
                                        >
                                            <option value="" disabled>Wählen...</option>
                                            {VEHICLE_MAKES.map((make) => (
                                                <option key={make} value={make}>{make}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    {isOtherMake && (
                                        <Field label="Anderer Hersteller">
                                            <input
                                                className={fieldClass}
                                                value={formData.basicInfo.make}
                                                onChange={(event) => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, make: event.target.value } })}
                                                placeholder="Hersteller eingeben..."
                                                required
                                            />
                                        </Field>
                                    )}

                                    <Field label="Modell">
                                        <input
                                            className={fieldClass}
                                            value={formData.basicInfo.model}
                                            onChange={(event) => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, model: event.target.value } })}
                                            placeholder="z.B. Sprinter, Transporter"
                                            required
                                        />
                                    </Field>

                                    <Field label="Kennzeichen">
                                        <input
                                            className={cn(fieldClass, "uppercase")}
                                            value={formData.basicInfo.licensePlate}
                                            onChange={(event) => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, licensePlate: event.target.value } })}
                                            placeholder="G-XY 123"
                                            required
                                        />
                                    </Field>

                                    <Field label="Erstzulassung / Jahr">
                                        <input
                                            className={fieldClass}
                                            value={formData.basicInfo.year}
                                            onChange={(event) => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, year: event.target.value } })}
                                            placeholder="2024"
                                        />
                                    </Field>

                                    <Field label="Fahrgestellnummer (VIN)" className="md:col-span-2">
                                        <input
                                            className={cn(fieldClass, "uppercase")}
                                            value={formData.basicInfo.vin}
                                            onChange={(event) => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, vin: event.target.value } })}
                                            placeholder="WVGZZZ..."
                                        />
                                    </Field>

                                    <Field label="Farbe">
                                        <input
                                            className={fieldClass}
                                            value={formData.basicInfo.color}
                                            onChange={(event) => setFormData({ ...formData, basicInfo: { ...formData.basicInfo, color: event.target.value } })}
                                            placeholder="Weiß, Blau..."
                                        />
                                    </Field>
                                </FormSection>
                            )}

                            {activeTab === "fleet" && (
                                <FormSection icon={Truck} title="Flotte & Status" subtitle="Nutzung, Fahrer, Kilometerstand und Tankkarte.">
                                    <Field label="Status">
                                        <select
                                            className={fieldClass}
                                            value={normalizeStatus(formData.fleetDetails.status)}
                                            onChange={(event) => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, status: event.target.value as VehicleStatus } })}
                                        >
                                            <option value="Bereit">Bereit</option>
                                            <option value="In Benutzung">In Benutzung</option>
                                            <option value="Werkstatt">Werkstatt</option>
                                            <option value="Außer Betrieb">Außer Betrieb</option>
                                        </select>
                                    </Field>

                                    <Field label="Kilometerstand">
                                        <input
                                            type="number"
                                            className={fieldClass}
                                            value={formData.fleetDetails.currentMileage}
                                            onChange={(event) => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, currentMileage: parseInt(event.target.value) || 0 } })}
                                            placeholder="0"
                                        />
                                    </Field>

                                    <Field label="Zugewiesener Mitarbeiter">
                                        <input
                                            className={fieldClass}
                                            value={formData.fleetDetails.assignedEmployeeId || ""}
                                            onChange={(event) => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, assignedEmployeeId: event.target.value } })}
                                            placeholder="Name oder Mitarbeiter-ID"
                                        />
                                    </Field>

                                    <Field label="Tankkarten-Nr.">
                                        <input
                                            className={fieldClass}
                                            value={formData.fleetDetails.fuelCardNumber || ""}
                                            onChange={(event) => setFormData({ ...formData, fleetDetails: { ...formData.fleetDetails, fuelCardNumber: event.target.value } })}
                                            placeholder="Nr. der Tankkarte"
                                        />
                                    </Field>
                                </FormSection>
                            )}

                            {activeTab === "maintenance" && (
                                <FormSection icon={Wrench} title="Wartung" subtitle="TÜV, Service und Bereifung im Blick behalten.">
                                    <Field label="Nächster TÜV">
                                        <input
                                            type="date"
                                            className={fieldClass}
                                            value={formData.maintenance.nextTUV}
                                            onChange={(event) => setFormData({ ...formData, maintenance: { ...formData.maintenance, nextTUV: event.target.value } })}
                                        />
                                    </Field>

                                    <Field label="Letzter Service">
                                        <input
                                            type="date"
                                            className={fieldClass}
                                            value={formData.maintenance.lastService}
                                            onChange={(event) => setFormData({ ...formData, maintenance: { ...formData.maintenance, lastService: event.target.value } })}
                                        />
                                    </Field>

                                    <Field label="Nächster Service">
                                        <input
                                            type="date"
                                            className={fieldClass}
                                            value={formData.maintenance.nextService || ""}
                                            onChange={(event) => setFormData({ ...formData, maintenance: { ...formData.maintenance, nextService: event.target.value } })}
                                        />
                                    </Field>

                                    <Field label="Bereifung">
                                        <select
                                            className={fieldClass}
                                            value={formData.maintenance.tireChangeDue || ""}
                                            onChange={(event) => setFormData({ ...formData, maintenance: { ...formData.maintenance, tireChangeDue: event.target.value as any } })}
                                        >
                                            <option value="">Wählen...</option>
                                            <option value="Sommer">Sommer</option>
                                            <option value="Winter">Winter</option>
                                            <option value="Allwetter">Allwetter</option>
                                        </select>
                                    </Field>
                                </FormSection>
                            )}

                            {activeTab === "documents" && (
                                <div className="mx-auto max-w-5xl space-y-5">
                                    <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-950">Dokumente</h3>
                                                    <p className="text-sm font-semibold text-slate-500">Fahrzeugschein, Versicherung, Kaufvertrag oder Fotos.</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Datei wählen
                                            </button>
                                            <input type="file" ref={fileInputRef} onChange={addDocument} className="hidden" />
                                        </div>
                                    </div>

                                    {formData.documents.length === 0 ? (
                                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                                            <FileText className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                                            <p className="font-black text-slate-900">Noch keine Unterlagen hinterlegt</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-500">Lade hier die ersten Fahrzeugdokumente hoch.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {formData.documents.map((doc) => (
                                                <button
                                                    key={doc.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setPreviewDoc(doc);
                                                        setIsPreviewOpen(true);
                                                    }}
                                                    className="group flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/70"
                                                >
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-black text-slate-950 group-hover:text-indigo-700">{doc.name}</p>
                                                            <p className="mt-1 text-xs font-bold text-slate-400">{new Date(doc.uploadDate).toLocaleDateString("de-AT")} · {doc.fileSize}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 gap-2" onClick={(event) => event.stopPropagation()}>
                                                        {doc.content && (
                                                            <a
                                                                href={doc.content}
                                                                download={doc.name}
                                                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDocument(doc.id)}
                                                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>

                        <footer className="relative z-20 flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-2xl bg-slate-100 px-6 py-3.5 text-sm font-black text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSubmit()}
                                className="min-w-[220px] rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                {initialVehicle ? "Änderungen speichern" : "Fahrzeug anlegen"}
                            </button>
                        </footer>
                    </section>
                </div>
            </div>

            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                document={previewDoc}
            />
        </div>
    );
}

function FormSection({
    icon: Icon,
    title,
    subtitle,
    children,
}: {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-950">{title}</h3>
                    <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
                </div>
            </div>
            <div className="grid gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
                {children}
            </div>
        </div>
    );
}

function Field({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={cn("block space-y-2", className)}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            {children}
        </label>
    );
}
