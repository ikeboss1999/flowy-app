"use client";

import React, { useState, useEffect } from "react";
import { X, Briefcase, MapPin, Banknote, Save, Plus, ChevronDown, ChevronUp, Trash2, ListChecks } from "lucide-react";
import { Project, ProjectStatus, PaymentPlanItem } from "@/types/project";
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
    const [paymentPlan, setPaymentPlan] = useState<PaymentPlanItem[]>([]);
    const [copyCustomerAddress, setCopyCustomerAddress] = useState(false);
    const [isPaymentPlanOpen, setIsPaymentPlanOpen] = useState(false);
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
            setPaymentPlan(initialProject.paymentPlan || []);
            setIsPaymentPlanOpen((initialProject.paymentPlan || []).length > 0);
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
            setPaymentPlan([]);
            setIsPaymentPlanOpen(false);
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

    const addPaymentPlanItem = () => {
        const hasFinal = paymentPlan.some(item => item.type === 'final');
        setPaymentPlan(prev => [...prev, {
            id: generateUUID(),
            name: hasFinal ? `${prev.length + 1}. Teilrechnung` : (prev.length === 0 ? 'Anzahlung' : `${prev.length + 1}. Teilrechnung`),
            amount: 0,
            status: 'planned',
            type: 'partial'
        }]);
    };

    const removePaymentPlanItem = (id: string) => {
        setPaymentPlan(prev => prev.filter(item => item.id !== id));
    };

    const updatePaymentPlanItem = (id: string, updates: Partial<PaymentPlanItem>) => {
        setPaymentPlan(prev => prev.map(item => {
            if (item.id === id) {
                const newItem = { ...item, ...updates };
                // Auto-update name if type changed to final
                if (updates.type === 'final' && item.type !== 'final') {
                    newItem.name = 'Schlussrechnung';
                } else if (updates.type === 'partial' && item.type === 'final') {
                    newItem.name = `${prev.filter(i => i.type === 'partial').length + 1}. Teilrechnung`;
                }
                return newItem;
            }
            return item;
        }));
    };

    const isFormValid = formData.name.trim() !== "" && 
                        formData.customerId !== "" && 
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
            paymentPlan: paymentPlan.length > 0 ? paymentPlan : undefined,
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl xl:max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
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

                    {/* Address */}
                    <div className="space-y-4">
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

                    {/* Payment Plan */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setIsPaymentPlanOpen(prev => !prev)}
                            className="flex items-center gap-2 w-full text-left px-1"
                        >
                            <ListChecks className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Zahlungsplan</span>
                            {paymentPlan.length > 0 && (
                                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                                    {paymentPlan.length} Pos.
                                </span>
                            )}
                            <span className="ml-auto text-slate-400">
                                {isPaymentPlanOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                        </button>

                        {isPaymentPlanOpen && (
                            <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                {paymentPlan.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{index + 1}.</span>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={e => updatePaymentPlanItem(item.id, { name: e.target.value })}
                                            placeholder="Bezeichnung"
                                            className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        />
                                        <input
                                            type="number"
                                            value={item.amount || ''}
                                            onChange={e => updatePaymentPlanItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                            placeholder="Netto €"
                                            step="0.01"
                                            className="w-28 shrink-0 px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        />
                                        <select
                                            value={item.type || 'partial'}
                                            onChange={e => updatePaymentPlanItem(item.id, { type: e.target.value as 'partial' | 'final' })}
                                            className="w-36 shrink-0 px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none"
                                        >
                                            <option value="partial">Teilrechnung</option>
                                            <option value="final">Schlussrechnung</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removePaymentPlanItem(item.id)}
                                            className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addPaymentPlanItem}
                                    className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> Position hinzufügen
                                </button>
                            </div>
                        )}
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
