"use client";

import React, { useState, useEffect } from "react";
import { X, Briefcase, MapPin, Building, Calendar, Banknote, Save, Plus } from "lucide-react";
import { Project, ProjectStatus } from "@/types/project";
import { Customer } from "@/types/customer";
import { cn } from "@/lib/utils";
import { CustomerModal } from "@/components/CustomerModal";

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Project) => void;
    onAddCustomer: (customer: Customer) => void;
    customers: Customer[];
    initialProject?: Project;
}

export function ProjectModal({ isOpen, onClose, onSave, onAddCustomer, customers, initialProject }: ProjectModalProps) {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        customerId: "",
        status: "active" as ProjectStatus,
        street: "",
        city: "",
        zip: "",
        description: "",
        budget: ""
    });

    useEffect(() => {
        if (initialProject) {
            setFormData({
                name: initialProject.name,
                customerId: initialProject.customerId,
                status: initialProject.status,
                street: initialProject.address.street,
                city: initialProject.address.city,
                zip: initialProject.address.zip,
                description: initialProject.description || "",
                budget: initialProject.budget ? initialProject.budget.toString() : ""
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
                budget: ""
            });
        }
    }, [initialProject, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const project: Project = {
            id: initialProject?.id || crypto.randomUUID(),
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
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {initialProject ? "Baustelle bearbeiten" : "Neue Baustelle"}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Legen Sie ein neues Projekt an.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Projektbezeichnung</label>
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
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kunde</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomerModalOpen(true)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="h-3 w-3" /> Neuer Kunde
                                </button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Building className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <select
                                    required
                                    name="customerId"
                                    value={formData.customerId}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                                >
                                    <option value="">Bitte wählen...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.address.city})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
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
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Projekt Summe (Netto)</label>
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
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Baustellenadresse
                        </label>
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
                </form>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-50 bg-slate-50/50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-[2] px-6 py-3.5 bg-primary-gradient text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
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
