"use client";

import React, { useState, useEffect } from "react";
import { X, User, Briefcase, Mail, Phone, MapPin, FileText, Save, Clock } from "lucide-react";
import { Customer, CustomerType, CustomerStatus } from "@/types/customer";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { cn } from "@/lib/utils";

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
    initialCustomer?: Customer;
}

export function CustomerModal({ isOpen, onClose, onSave, initialCustomer }: CustomerModalProps) {
    const [type, setType] = useState<CustomerType>('private');
    const [status, setStatus] = useState<CustomerStatus>('active');
    const { data: invoiceSettings } = useInvoiceSettings();
    const [formData, setFormData] = useState({
        name: "",
        salutation: "",
        email: "",
        phone: "",
        street: "",
        city: "",
        zip: "",
        taxId: "",
        commercialRegisterNumber: "",
        reverseChargeEnabled: false,
        defaultPaymentTermId: "",
        notes: ""
    });

    useEffect(() => {
        if (initialCustomer) {
            setType(initialCustomer.type);
            setStatus(initialCustomer.status || 'active');
            setFormData({
                name: initialCustomer.name,
                salutation: initialCustomer.salutation || "",
                email: initialCustomer.email,
                phone: initialCustomer.phone,
                street: initialCustomer.address.street,
                city: initialCustomer.address.city,
                zip: initialCustomer.address.zip,
                taxId: initialCustomer.taxId || "",
                commercialRegisterNumber: initialCustomer.commercialRegisterNumber || "",
                reverseChargeEnabled: initialCustomer.reverseChargeEnabled || false,
                defaultPaymentTermId: initialCustomer.defaultPaymentTermId || "",
                notes: initialCustomer.notes || ""
            });
        } else {
            setStatus('active');
            setFormData({
                name: "",
                salutation: "",
                email: "",
                phone: "",
                street: "",
                city: "",
                zip: "",
                taxId: "",
                commercialRegisterNumber: "",
                reverseChargeEnabled: false,
                defaultPaymentTermId: "",
                notes: ""
            });
        }
    }, [initialCustomer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customer: Customer = {
            id: initialCustomer?.id || crypto.randomUUID(),
            type,
            status,
            salutation: formData.salutation,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: {
                street: formData.street,
                city: formData.city,
                zip: formData.zip
            },
            taxId: type === 'business' ? formData.taxId : undefined,
            commercialRegisterNumber: type === 'business' ? formData.commercialRegisterNumber : undefined,
            reverseChargeEnabled: type === 'business' ? formData.reverseChargeEnabled : false,
            defaultPaymentTermId: formData.defaultPaymentTermId || undefined,
            notes: formData.notes,
            createdAt: initialCustomer?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActivity: initialCustomer?.lastActivity || new Date().toISOString()
        };
        onSave(customer);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
                            {initialCustomer ? "Kunde bearbeiten" : "Neuer Kunde"}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Geben Sie hier die Kundendetails ein.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Customer Type & Status */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Kundentyp</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType('private')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-bold text-xs",
                                        type === 'private'
                                            ? "border-indigo-500 bg-indigo-50/50 text-indigo-700"
                                            : "border-slate-100 text-slate-500"
                                    )}
                                >
                                    <User className="h-4 w-4" /> Privat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('business')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-bold text-xs",
                                        type === 'business'
                                            ? "border-indigo-500 bg-indigo-50/50 text-indigo-700"
                                            : "border-slate-100 text-slate-500"
                                    )}
                                >
                                    <Briefcase className="h-4 w-4" /> Geschäft
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Status</label>
                            <div className="flex gap-2">
                                {(['active', 'inactive', 'blocked'] as CustomerStatus[]).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStatus(s)}
                                        className={cn(
                                            "flex-1 p-3 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-wider",
                                            status === s
                                                ? s === 'active' ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                    : s === 'inactive' ? "border-amber-500 bg-amber-50 text-amber-700"
                                                        : "border-rose-500 bg-rose-50 text-rose-700"
                                                : "border-slate-100 text-slate-400"
                                        )}
                                    >
                                        {s === 'active' ? 'Aktiv' : s === 'inactive' ? 'Inaktiv' : 'Gesperrt'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Anrede</label>
                            <select
                                name="salutation"
                                value={formData.salutation}
                                onChange={(e) => setFormData(prev => ({ ...prev, salutation: e.target.value }))}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                            >
                                <option value="">-</option>
                                <option value="Herr">Herr</option>
                                <option value="Frau">Frau</option>
                                <option value="Familie">Familie</option>
                                <option value="Firma">Firma</option>
                            </select>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                                {type === 'private' ? "Vollständiger Name" : "Firmenname"}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder={type === 'private' ? "z.B. Max Mustermann" : "z.B. Muster GmbH"}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">E-Mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="mail@beispiel.at"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Telefon</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    required
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+43 664 1234567"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Info */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Anschrift
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

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-6">
                        {type === 'business' && (
                            <div className="col-span-2 grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Steuernummer / USt-ID</label>
                                    <input
                                        name="taxId"
                                        value={formData.taxId}
                                        onChange={handleChange}
                                        placeholder="ATU12345678"
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Firmenbuchnummer</label>
                                    <input
                                        name="commercialRegisterNumber"
                                        value={formData.commercialRegisterNumber}
                                        onChange={handleChange}
                                        placeholder="z.B. FN 123456 x"
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2 mt-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Reverse Charge</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, reverseChargeEnabled: !prev.reverseChargeEnabled }))}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all font-bold text-sm",
                                            formData.reverseChargeEnabled
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-slate-100 bg-slate-50 text-slate-500"
                                        )}
                                    >
                                        <span>Berechtigt</span>
                                        <div className={cn(
                                            "w-10 h-5 rounded-full relative transition-colors",
                                            formData.reverseChargeEnabled ? "bg-emerald-500" : "bg-slate-200"
                                        )}>
                                            <div className={cn(
                                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                                formData.reverseChargeEnabled ? "right-1" : "left-1"
                                            )} />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Clock className="h-3 w-3" /> Zahlungskonditionen (Standard)
                            </label>
                            <select
                                name="defaultPaymentTermId"
                                value={formData.defaultPaymentTermId}
                                onChange={(e) => setFormData(prev => ({ ...prev, defaultPaymentTermId: e.target.value }))}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat"
                            >
                                <option value="">Globaler Standard (Einstellungen)</option>
                                {invoiceSettings.paymentTerms?.map(term => (
                                    <option key={term.id} value={term.id}>
                                        {term.name} ({term.days} Tage)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Notizen
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Zusätzliche Informationen..."
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                            />
                        </div>
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
                        {initialCustomer ? "Änderungen speichern" : "Kunde anlegen"}
                    </button>
                </div>
            </div>
        </div>
    );
}
