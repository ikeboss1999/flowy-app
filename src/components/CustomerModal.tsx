"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Briefcase,
    CheckCircle2,
    Clock,
    FileText,
    Hash,
    Mail,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    User,
    X,
} from "lucide-react";
import { Customer, CustomerStatus, CustomerType } from "@/types/customer";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { useCustomerSettings } from "@/hooks/useCustomerSettings";
import { cn, generateUUID } from "@/lib/utils";

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
    initialCustomer?: Customer;
    existingCustomers?: Customer[];
}

const inputClasses = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";
const labelClasses = "px-1 text-[10px] font-black uppercase tracking-widest text-slate-400";

export function CustomerModal({ isOpen, onClose, onSave, initialCustomer, existingCustomers = [] }: CustomerModalProps) {
    const [type, setType] = useState<CustomerType>("private");
    const [status, setStatus] = useState<CustomerStatus>("active");
    const { data: invoiceSettings } = useInvoiceSettings();
    const { data: customerSettings, updateData: updateCustomerSettings } = useCustomerSettings();
    const [error, setError] = useState<string | null>(null);
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
        notes: "",
        customer_number: ""
    });

    const isBusiness = type === "business";

    useEffect(() => {
        if (initialCustomer) {
            setType(initialCustomer.type);
            setStatus(initialCustomer.status || "active");
            setFormData({
                name: initialCustomer.name,
                salutation: initialCustomer.salutation || "",
                email: initialCustomer.email || "",
                phone: initialCustomer.phone || "",
                street: initialCustomer.address?.street || "",
                city: initialCustomer.address?.city || "",
                zip: initialCustomer.address?.zip || "",
                taxId: initialCustomer.taxId || "",
                commercialRegisterNumber: initialCustomer.commercialRegisterNumber || "",
                reverseChargeEnabled: !!initialCustomer.reverseChargeEnabled,
                defaultPaymentTermId: initialCustomer.defaultPaymentTermId || "",
                notes: initialCustomer.notes || "",
                customer_number: initialCustomer.customer_number || ""
            });
        } else {
            setType("private");
            setStatus("active");
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
                notes: "",
                customer_number: ""
            });
        }
        setError(null);
    }, [initialCustomer, isOpen]);

    useEffect(() => {
        if (!initialCustomer && isOpen && customerSettings) {
            const numStr = String(customerSettings.nextNumber || 10000);
            const padding = Math.max(0, (customerSettings.mindestLaenge || 5) - numStr.length);
            const generated = `${customerSettings.prefix || ""}${"0".repeat(padding)}${numStr}`;
            setFormData(prev => prev.customer_number ? prev : { ...prev, customer_number: generated });
        }
    }, [customerSettings, initialCustomer, isOpen]);

    useEffect(() => {
        if (isBusiness && !formData.salutation) {
            setFormData(prev => ({ ...prev, salutation: "Firma" }));
        }
    }, [isBusiness, formData.salutation]);

    const previewAddress = useMemo(() => {
        const line = [formData.zip, formData.city].filter(Boolean).join(" ");
        return [formData.street, line].filter(Boolean).join(", ");
    }, [formData.street, formData.zip, formData.city]);

    if (!isOpen) return null;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        const missingFields: string[] = [];
        if (!formData.customer_number.trim()) missingFields.push("Kundennummer");
        if (!formData.salutation.trim()) missingFields.push("Anrede");
        if (!formData.name.trim()) missingFields.push(isBusiness ? "Firmenname" : "Name");
        if (!formData.street.trim()) missingFields.push("Straße");
        if (!formData.zip.trim()) missingFields.push("PLZ");
        if (!formData.city.trim()) missingFields.push("Ort");
        if (isBusiness) {
            if (!formData.email.trim()) missingFields.push("E-Mail");
            if (!formData.taxId.trim()) missingFields.push("UID-Nummer");
        }

        if (missingFields.length > 0) {
            setError(`Bitte füllen Sie alle Pflichtfelder aus: ${missingFields.join(", ")}`);
            return;
        }

        const normalizedName = formData.name.trim().toLowerCase();
        const normalizedEmail = formData.email.trim().toLowerCase();
        const normalizedNumber = formData.customer_number.trim().toLowerCase();
        const nameDuplicate = existingCustomers.some(customer => customer.id !== initialCustomer?.id && customer.name?.trim().toLowerCase() === normalizedName);
        const emailDuplicate = normalizedEmail && existingCustomers.some(customer => customer.id !== initialCustomer?.id && customer.email?.trim().toLowerCase() === normalizedEmail);
        const numberDuplicate = normalizedNumber && existingCustomers.some(customer => customer.id !== initialCustomer?.id && customer.customer_number?.trim().toLowerCase() === normalizedNumber);

        if (numberDuplicate) {
            setError("Diese Kundennummer ist bereits vergeben. Bitte wählen Sie eine andere.");
            return;
        }

        if (nameDuplicate || emailDuplicate) {
            setError("Ein Kunde mit diesem Namen oder dieser E-Mail existiert bereits.");
            return;
        }

        if (!initialCustomer && customerSettings) {
            const numStr = String(customerSettings.nextNumber || 10000);
            const padding = Math.max(0, (customerSettings.mindestLaenge || 5) - numStr.length);
            const generated = `${customerSettings.prefix || ""}${"0".repeat(padding)}${numStr}`;
            if (formData.customer_number === generated) {
                updateCustomerSettings({ nextNumber: customerSettings.nextNumber + 1 });
            }
        }

        const customer: Customer = {
            id: initialCustomer?.id || generateUUID(),
            type,
            status,
            salutation: formData.salutation,
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: {
                street: formData.street.trim(),
                city: formData.city.trim(),
                zip: formData.zip.trim()
            },
            taxId: isBusiness ? formData.taxId.trim() : undefined,
            commercialRegisterNumber: isBusiness ? formData.commercialRegisterNumber.trim() : undefined,
            reverseChargeEnabled: isBusiness ? formData.reverseChargeEnabled : false,
            defaultPaymentTermId: formData.defaultPaymentTermId || undefined,
            customer_number: formData.customer_number.trim(),
            notes: formData.notes,
            createdAt: initialCustomer?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActivity: initialCustomer?.lastActivity || new Date().toISOString()
        };

        onSave(customer);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl",
                            isBusiness ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"
                        )}>
                            {isBusiness ? <Briefcase className="h-6 w-6" /> : <User className="h-6 w-6" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Kundenakte</p>
                            <h2 className="text-2xl font-black text-slate-900">
                                {initialCustomer ? "Kunde bearbeiten" : "Neuer Kunde"}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition-colors hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="grid flex-1 overflow-y-auto xl:grid-cols-[360px_1fr]">
                    <aside className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
                        <div className="relative space-y-6">
                            <div className="rounded-[32px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div className={cn(
                                        "flex h-16 w-16 items-center justify-center rounded-3xl bg-white",
                                        isBusiness ? "text-emerald-600" : "text-purple-600"
                                    )}>
                                        {isBusiness ? <Briefcase className="h-8 w-8" /> : <User className="h-8 w-8" />}
                                    </div>
                                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/70">
                                        {status === "active" ? "Aktiv" : status === "inactive" ? "Inaktiv" : "Gesperrt"}
                                    </span>
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-cyan-100/70">
                                    {formData.customer_number || "Kundennummer"}
                                </p>
                                <h3 className="mt-2 break-words text-3xl font-black leading-tight">
                                    {formData.name || (isBusiness ? "Firmenname" : "Kundenname")}
                                </h3>
                                <p className="mt-3 text-sm font-semibold text-white/60">
                                    {previewAddress || "Adresse wird hier angezeigt"}
                                </p>
                            </div>

                            <div className="grid gap-3">
                                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                    <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
                                        <Mail className="h-3.5 w-3.5" /> E-Mail
                                    </p>
                                    <p className="truncate text-sm font-bold text-white/85">{formData.email || "-"}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                    <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
                                        <Phone className="h-3.5 w-3.5" /> Telefon
                                    </p>
                                    <p className="truncate text-sm font-bold text-white/85">{formData.phone || "-"}</p>
                                </div>
                                {isBusiness && (
                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                        <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
                                            <ShieldCheck className="h-3.5 w-3.5" /> Reverse Charge
                                        </p>
                                        <p className="text-sm font-bold text-white/85">{formData.reverseChargeEnabled ? "Aktiv" : "Inaktiv"}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    <main className="space-y-6 p-6 sm:p-8">
                        {error && (
                            <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <Hash className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-black text-slate-900">Kundentyp & Status</h3>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className={labelClasses}>Kundentyp</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {([
                                            { id: "private" as const, label: "Privat", icon: User },
                                            { id: "business" as const, label: "Geschäft", icon: Briefcase },
                                        ]).map(({ id, label, icon: Icon }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setType(id)}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-black transition-all",
                                                    type === id
                                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={labelClasses}>Status</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["active", "inactive", "blocked"] as CustomerStatus[]).map(item => (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setStatus(item)}
                                                className={cn(
                                                    "rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-wider transition-all",
                                                    status === item
                                                        ? item === "active" ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
                                                            item === "inactive" ? "border-amber-500 bg-amber-50 text-amber-700" :
                                                                "border-rose-500 bg-rose-50 text-rose-700"
                                                        : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-white"
                                                )}
                                            >
                                                {item === "active" ? "Aktiv" : item === "inactive" ? "Inaktiv" : "Gesperrt"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <User className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-black text-slate-900">Stammdaten</h3>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label className={labelClasses}>Anrede *</label>
                                    <select
                                        name="salutation"
                                        value={formData.salutation}
                                        onChange={(event) => setFormData(prev => ({ ...prev, salutation: event.target.value }))}
                                        className={inputClasses}
                                    >
                                        <option value="">Auswählen</option>
                                        <option value="Herr">Herr</option>
                                        <option value="Frau">Frau</option>
                                        <option value="Familie">Familie</option>
                                        <option value="Firma">Firma</option>
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className={labelClasses}>{isBusiness ? "Firmenname" : "Vollständiger Name"} *</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder={isBusiness ? "z.B. Muster Bau GmbH" : "z.B. Max Mustermann"}
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Kundennummer *</label>
                                    <input
                                        name="customer_number"
                                        value={formData.customer_number}
                                        onChange={handleChange}
                                        placeholder="z.B. KD-10001"
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>E-Mail {isBusiness ? "*" : ""}</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="office@firma.at"
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Telefon</label>
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={(event) => setFormData(prev => ({ ...prev, phone: event.target.value.replace(/[^0-9+ ]/g, "") }))}
                                        placeholder="0664 1234567"
                                        inputMode="tel"
                                        className={inputClasses}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-black text-slate-900">Adresse</h3>
                            </div>
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2 md:col-span-4">
                                    <label className={labelClasses}>Straße und Hausnummer *</label>
                                    <input name="street" value={formData.street} onChange={handleChange} placeholder="Musterstraße 12" className={inputClasses} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>PLZ *</label>
                                    <input
                                        name="zip"
                                        value={formData.zip}
                                        onChange={(event) => setFormData(prev => ({ ...prev, zip: event.target.value.replace(/[^0-9]/g, "") }))}
                                        placeholder="8010"
                                        inputMode="numeric"
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-3">
                                    <label className={labelClasses}>Ort *</label>
                                    <input name="city" value={formData.city} onChange={handleChange} placeholder="Graz" className={inputClasses} />
                                </div>
                            </div>
                        </section>

                        {isBusiness && (
                            <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <ShieldCheck className="h-5 w-5 text-indigo-500" />
                                    <h3 className="text-lg font-black text-slate-900">Geschäftsdaten</h3>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className={labelClasses}>UID-Nummer *</label>
                                        <input name="taxId" value={formData.taxId} onChange={handleChange} placeholder="ATU12345678" className={inputClasses} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClasses}>Firmenbuchnummer</label>
                                        <input name="commercialRegisterNumber" value={formData.commercialRegisterNumber} onChange={handleChange} placeholder="FN 123456 x" className={inputClasses} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className={labelClasses}>Reverse Charge</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, reverseChargeEnabled: !prev.reverseChargeEnabled }))}
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-2xl border px-4 py-4 font-black transition-all",
                                                formData.reverseChargeEnabled
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-50 text-slate-500"
                                            )}
                                        >
                                            <span>{formData.reverseChargeEnabled ? "Reverse Charge aktiv" : "Reverse Charge inaktiv"}</span>
                                            <span className={cn(
                                                "relative h-6 w-12 rounded-full transition-colors",
                                                formData.reverseChargeEnabled ? "bg-emerald-500" : "bg-slate-300"
                                            )}>
                                                <span className={cn(
                                                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-all",
                                                    formData.reverseChargeEnabled ? "right-1" : "left-1"
                                                )} />
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <Clock className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-black text-slate-900">Konditionen & Notizen</h3>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <label className={labelClasses}>Zahlungskonditionen</label>
                                    <select
                                        name="defaultPaymentTermId"
                                        value={formData.defaultPaymentTermId}
                                        onChange={(event) => setFormData(prev => ({ ...prev, defaultPaymentTermId: event.target.value }))}
                                        className={inputClasses}
                                    >
                                        <option value="">Globaler Standard aus Einstellungen</option>
                                        {invoiceSettings?.paymentTerms?.map(term => (
                                            <option key={term.id} value={term.id}>
                                                {term.name} ({term.days} Tage)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Interne Notizen</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Besondere Hinweise, Ansprechpartner oder interne Informationen..."
                                        className={cn(inputClasses, "resize-none")}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-slate-100 bg-white/90 p-6 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="submit"
                                className="bg-primary-gradient flex-[2] rounded-2xl px-6 py-3.5 font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Save className="h-5 w-5" />
                                    {initialCustomer ? "Änderungen speichern" : "Kunde anlegen"}
                                </span>
                            </button>
                        </div>
                    </main>
                </form>
            </div>
        </div>
    );
}
