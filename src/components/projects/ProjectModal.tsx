"use client";

import React, { useState, useEffect } from "react";
import { X, Briefcase, MapPin, Banknote, Save, ListChecks } from "lucide-react";
import { Project, ProjectStatus } from "@/types/project";
import { Customer } from "@/types/customer";
import { cn, generateUUID } from "@/lib/utils";
import { CustomerModal } from "@/components/CustomerModal";
import { CustomerSearchSelect } from "@/components/CustomerSearchSelect";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Project) => void;
    onAddCustomer: (customer: Customer) => void;
    customers: Customer[];
    initialProject?: Project;
}

export function ProjectModal({ isOpen, onClose, onSave, onAddCustomer, customers, initialProject }: ProjectModalProps) {
    const { data: invoiceSettings } = useInvoiceSettings();
    const taxRate = invoiceSettings?.defaultTaxRate || 20; // Fallback to 20 if not loaded yet

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [copyCustomerAddress, setCopyCustomerAddress] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        customerId: "",
        status: "active" as ProjectStatus,
        street: "",
        city: "",
        zip: "",
        description: "",
        budget: "",
        budgetGross: ""
    });

    useEffect(() => {
        if (initialProject) {
            const net = initialProject.budget || 0;
            const gross = net * (1 + taxRate / 100);
            setFormData({
                name: initialProject.name,
                customerId: initialProject.customerId,
                status: initialProject.status,
                street: initialProject.address.street,
                city: initialProject.address.city,
                zip: initialProject.address.zip,
                description: initialProject.description || "",
                budget: net > 0 ? net.toString() : "",
                budgetGross: net > 0 ? gross.toFixed(2) : ""
            });
        } else {
            setFormData({
                name: "",
                customerId: "",
                status: "active",
                street: "",
                city: "",
                zip: "",
                description: "",
                budget: "",
                budgetGross: ""
            });
        }
        setCopyCustomerAddress(false);
    }, [initialProject, isOpen, taxRate]);

    if (!isOpen) return null;

    const handleCopyAddressChange = (checked: boolean) => {
        setCopyCustomerAddress(checked);
        if (checked) {
            const customer = customers.find(c => c.id === formData.customerId);
            if (customer?.address) {
                setFormData(prev => ({
                    ...prev,
                    street: customer.address.street || '',
                    city: customer.address.city || '',
                    zip: customer.address.zip || ''
                }));
            }
        } else {
            // Clear address when unchecking
            setFormData(prev => ({
                ...prev,
                street: '',
                city: '',
                zip: ''
            }));
        }
    };

    const selectedCustomer = customers.find((customer) => customer.id === formData.customerId);
    const isSelectedCustomerUsable = !selectedCustomer || selectedCustomer.status !== "draft";

    const isFormValid = formData.name.trim() !== "" && 
                        formData.customerId !== "" && 
                        isSelectedCustomerUsable &&
                        formData.budget !== "" && 
                        formData.street.trim() !== "" && 
                        formData.zip.trim() !== "" && 
                        formData.city.trim() !== "";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const project: Project = {
            id: initialProject?.id || generateUUID(),
            projectNumber: initialProject?.projectNumber,
            name: formData.name,
            customerId: formData.customerId,
            status: formData.status,
            address: {
                street: formData.street,
                city: formData.city,
                zip: formData.zip
            },
            description: formData.description,
            budget: formData.budget ? parseFloat(formData.budget) : undefined,
            paymentPlan: initialProject?.paymentPlan,
            diaryEntries: initialProject?.diaryEntries,
            createdAt: initialProject?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        onSave(project);
        onClose();
    };

    const handleAddCustomerResult = (customer: Customer) => {
        onAddCustomer(customer);
        setFormData(prev => ({ ...prev, customerId: customer.id }));
        setIsCustomerModalOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'budget') {
            const net = parseFloat(value) || 0;
            const gross = net * (1 + taxRate / 100);
            setFormData(prev => ({
                ...prev,
                budget: value,
                budgetGross: value === '' ? '' : gross.toFixed(2)
            }));
        } else if (name === 'budgetGross') {
            const gross = parseFloat(value) || 0;
            const net = gross / (1 + taxRate / 100);
            setFormData(prev => ({
                ...prev,
                budgetGross: value,
                budget: value === '' ? '' : net.toFixed(2)
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-white/30 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl rounded-[36px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-5 text-white sm:px-8">
                    <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
                    <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
                    <div className="relative flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/15">
                                <Briefcase className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-100">Projektakte</p>
                                <h2 className="text-2xl font-black tracking-tight text-white">
                                    {initialProject ? "Baustelle bearbeiten" : "Neue Baustelle"}
                                </h2>
                                <p className="text-sm font-semibold text-white/60">Projekt, Kunde, Adresse und Budget in einem Schritt erfassen.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 p-2 text-white/70 shadow-sm transition-colors hover:bg-white hover:text-indigo-700">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/60 p-6 sm:p-8">
                    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    {/* Basic Info */}
                    <section className="space-y-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Briefcase className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-950">Projektgrunddaten</h3>
                                <p className="text-sm font-semibold text-slate-500">Bezeichnung, Kunde, Status und Summe.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                                Projektbezeichnung <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Briefcase className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="z.B. Neubau Wohnhaus Müller"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                                Kunde <span className="text-rose-500">*</span>
                            </label>
                            <CustomerSearchSelect
                                customers={customers}
                                selectedId={formData.customerId}
                                onSelect={(id) => setFormData(prev => ({ ...prev, customerId: id }))}
                                onAddNew={() => setIsCustomerModalOpen(true)}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                            >
                                <option value="active">Aktiv / Laufend</option>
                                <option value="planned">Geplant</option>
                                <option value="completed">Abgeschlossen</option>
                                <option value="on_hold">Pausiert</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                Projekt Summe (Netto) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Banknote className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 whitespace-nowrap overflow-hidden text-ellipsis">Projekt Summe (Brutto)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Banknote className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                                </div>
                                <input
                                    type="number"
                                    name="budgetGross"
                                    value={formData.budgetGross}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    className="w-full pl-12 pr-4 py-3.5 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-900"
                                />
                            </div>
                        </div>
                    </div>
                    </section>

                    {/* Address */}
                    <section className="space-y-6 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-950">Baustelle & Notizen</h3>
                                <p className="text-sm font-semibold text-slate-500">Adresse und Projektbeschreibung sauber ablegen.</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> Baustellenadresse <span className="text-rose-500">*</span>
                            </label>
                            <label className={cn(
                                "flex items-center gap-2 text-sm font-medium cursor-pointer select-none",
                                !formData.customerId ? "text-slate-300 cursor-not-allowed" : "text-slate-600"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={copyCustomerAddress}
                                    onChange={e => handleCopyAddressChange(e.target.checked)}
                                    disabled={!formData.customerId}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                                />
                                Von Kundenadresse übernehmen
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <input
                                    required
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    placeholder="Straße und Hausnummer"
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                />
                            </div>
                            <input
                                required
                                name="zip"
                                value={formData.zip}
                                onChange={handleChange}
                                placeholder="PLZ"
                                className="px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                            />
                            <input
                                required
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Stadt"
                                className="px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Beschreibung / Notizen</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Zusätzliche Informationen zum Projekt..."
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                        />
                    </div>
                    </section>

                    {/* Payment Plan hint */}
                    <div className="xl:col-span-2 flex items-start gap-3 rounded-[28px] border border-indigo-100 bg-indigo-50/70 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                            <ListChecks className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-indigo-900">Zahlungsplan in der Projektakte</p>
                            <p className="mt-1 text-sm font-medium leading-relaxed text-indigo-700/70">
                                Teilrechnungen und Schlussrechnung werden nach dem Speichern zentral im Projekt unter &quot;Zahlungsplan&quot; gepflegt.
                            </p>
                        </div>

                    </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-slate-100 bg-white flex gap-3 sm:px-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid}
                        className={cn(
                            "flex-[2] px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                            isFormValid 
                                ? "bg-primary-gradient text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95" 
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Save className="h-5 w-5" />
                        {initialProject ? "Änderungen speichern" : "Projekt anlegen"}
                    </button>
                </div>
            </div>

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleAddCustomerResult}
            />
        </div>
    );
}
