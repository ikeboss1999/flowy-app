"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2, MapPin, Save, X } from "lucide-react";
import { generateUUID } from "@/lib/utils";
import { Supplier, SupplierStatus } from "@/types/supplier";
import { useSupplierSettings } from "@/hooks/useSupplierSettings";

interface SupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplier: Supplier) => Promise<void> | void;
    initial?: Supplier;
    existing?: Supplier[];
}

const EMPTY_SUPPLIERS: Supplier[] = [];
const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10";

export function SupplierModal({ isOpen, onClose, onSave, initial, existing = EMPTY_SUPPLIERS }: SupplierModalProps) {
    const { data: numberSettings, updateData: updateNumberSettings } = useSupplierSettings();
    const [form, setForm] = useState({ supplierNumber: "", name: "", contactPerson: "", email: "", phone: "", street: "", zip: "", city: "", country: "Österreich", vatNumber: "", commercialRegisterNumber: "", bankName: "", iban: "", bic: "", paymentTermId: "", defaultCategory: "", notes: "" });
    const [status, setStatus] = useState<SupplierStatus>("active");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const highest = Math.max(0, ...existing.map((supplier) => Number(String(supplier.supplierNumber || "").match(/(\d+)$/)?.[1] || 0)));
        const nextNumber = Math.max(1, Number(numberSettings.nextNumber) || 1, highest + 1);
        const generated = `${numberSettings.prefix || "LF-"}${"0".repeat(Math.max(0, (Number(numberSettings.mindestLaenge) || 1) - String(nextNumber).length))}${nextNumber}`;
        if (!initial && nextNumber > (Number(numberSettings.nextNumber) || 1)) void updateNumberSettings({ nextNumber });
        setForm({
            supplierNumber: initial?.supplierNumber || generated,
            name: initial?.name || "",
            contactPerson: initial?.contactPerson || "",
            email: initial?.email || "",
            phone: initial?.phone || "",
            street: initial?.street || "",
            zip: initial?.zip || "",
            city: initial?.city || "",
            country: initial?.country || "Österreich",
            vatNumber: initial?.vatNumber || "",
            commercialRegisterNumber: initial?.commercialRegisterNumber || "",
            bankName: initial?.bankName || "",
            iban: initial?.iban || "",
            bic: initial?.bic || "",
            paymentTermId: initial?.paymentTermId || "",
            defaultCategory: initial?.defaultCategory || "",
            notes: initial?.notes || "",
        });
        setStatus(initial?.status || "active");
        setError(null);
    // The generated number is initialized only when the modal/context changes.
    // updateNumberSettings is intentionally excluded: it is recreated by the hook
    // and would otherwise reset typed form values on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initial, existing, numberSettings]);

    if (!isOpen) return null;
    const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!form.name.trim()) { setError("Bitte geben Sie zumindest den Lieferantennamen ein."); return; }
        const duplicate = existing.some((supplier) => supplier.id !== initial?.id && supplier.supplierNumber.toLowerCase() === form.supplierNumber.trim().toLowerCase());
        if (duplicate) { setError("Diese Lieferantennummer ist bereits vergeben."); return; }
        try {
            await onSave({ id: initial?.id || generateUUID(), ...form, supplierNumber: form.supplierNumber.trim(), name: form.name.trim(), status, createdAt: initial?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
            if (!initial) {
                const used = Number(form.supplierNumber.match(/(\d+)$/)?.[1] || numberSettings.nextNumber);
                await updateNumberSettings({ nextNumber: used + 1 });
            }
            onClose();
        } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Lieferant konnte nicht gespeichert werden."); }
    };

    return <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 p-4"><div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[36px] bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-gradient-to-br from-slate-950 via-cyan-950 to-indigo-900 px-6 py-6 text-white sm:px-8"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-200"><Building2 /></span><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-100">Lieferantenakte</p><div className="flex items-center gap-3"><h2 className="text-2xl font-black">{initial ? "Lieferant bearbeiten" : "Neuer Lieferant"}</h2><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase">{status === "active" ? "Aktiv" : status === "inactive" ? "Inaktiv" : "Gesperrt"}</span></div></div></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 p-2 transition hover:bg-white hover:text-cyan-800" aria-label="Schließen"><X /></button></header>
        <form onSubmit={submit} className="flex-1 overflow-y-auto bg-slate-50/70 p-6 sm:p-8"><div className="mx-auto max-w-5xl space-y-5">
            {error && <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700"><AlertTriangle className="shrink-0" />{error}</div>}
            <section className="rounded-[30px] border border-slate-100 bg-white p-5"><h3 className="mb-5 text-lg font-black">Stammdaten</h3><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-bold md:col-span-2">Lieferantenname *<input className={input} value={form.name} onChange={(event) => change("name", event.target.value)} placeholder="z. B. Musterhandel GmbH" /></label><label className="space-y-2 text-sm font-bold">Lieferantennummer<input className={`${input} cursor-not-allowed bg-cyan-50 text-cyan-700`} value={form.supplierNumber} readOnly /></label><label className="space-y-2 text-sm font-bold">Status<select className={input} value={status} onChange={(event) => setStatus(event.target.value as SupplierStatus)}><option value="active">Aktiv</option><option value="inactive">Inaktiv</option><option value="blocked">Gesperrt</option></select></label><label className="space-y-2 text-sm font-bold">Ansprechpartner<input className={input} value={form.contactPerson} onChange={(event) => change("contactPerson", event.target.value)} /></label><label className="space-y-2 text-sm font-bold">E-Mail<input className={input} type="email" value={form.email} onChange={(event) => change("email", event.target.value)} /></label><label className="space-y-2 text-sm font-bold">Telefon<input className={input} value={form.phone} onChange={(event) => change("phone", event.target.value)} /></label><label className="space-y-2 text-sm font-bold">Standardkategorie<input className={input} value={form.defaultCategory} onChange={(event) => change("defaultCategory", event.target.value)} placeholder="z. B. Baumaterial" /></label></div></section>
            <section className="rounded-[30px] border border-slate-100 bg-white p-5"><div className="mb-5 flex items-center gap-3"><MapPin className="text-cyan-600" /><h3 className="text-lg font-black">Adresse & Steuerdaten</h3></div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-bold md:col-span-2">Straße<input className={input} value={form.street} onChange={(event) => change("street", event.target.value)} /></label><label className="space-y-2 text-sm font-bold">PLZ<input className={input} value={form.zip} onChange={(event) => change("zip", event.target.value.replace(/[^0-9]/g, ""))} /></label><label className="space-y-2 text-sm font-bold">Ort<input className={input} value={form.city} onChange={(event) => change("city", event.target.value)} /></label><label className="space-y-2 text-sm font-bold">UID-Nummer<input className={input} value={form.vatNumber} onChange={(event) => change("vatNumber", event.target.value.toUpperCase())} placeholder="ATU12345678" /></label><label className="space-y-2 text-sm font-bold">Firmenbuchnummer<input className={input} value={form.commercialRegisterNumber} onChange={(event) => change("commercialRegisterNumber", event.target.value)} /></label></div></section>
            <section className="rounded-[30px] border border-slate-100 bg-white p-5"><h3 className="mb-5 text-lg font-black">Zahlung & Notizen</h3><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-bold md:col-span-2">Zahlungskondition<input className={input} value={form.paymentTermId} onChange={(event) => change("paymentTermId", event.target.value)} placeholder="z. B. 14 Tage netto" /></label><input className={input} value={form.bankName} onChange={(event) => change("bankName", event.target.value)} placeholder="Bankname" /><input className={input} value={form.iban} onChange={(event) => change("iban", event.target.value.toUpperCase())} placeholder="IBAN" /><input className={input} value={form.bic} onChange={(event) => change("bic", event.target.value.toUpperCase())} placeholder="BIC" /></div><textarea className={`${input} mt-4 resize-none`} rows={4} value={form.notes} onChange={(event) => change("notes", event.target.value)} placeholder="Interne Notizen ..." /></section>
            <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-500">Abbrechen</button><button className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-black text-white shadow-lg shadow-cyan-200"><Save className="h-4 w-4" /> Speichern</button></div>
        </div></form>
    </div></div>;
}
