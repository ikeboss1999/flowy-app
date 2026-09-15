"use client";

import React from "react";
import { AlignLeft, ArrowLeft, BookOpen, FileSignature, Info, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOffers } from "@/hooks/useOffers";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { useSubcontractorDescriptions } from "@/hooks/useSubcontractorDescriptions";
import { useSubcontractorSettings } from "@/hooks/useSubcontractorSettings";
import { useServices } from "@/hooks/useServices";
import { useNotification } from "@/context/NotificationContext";
import { RichTextEditor } from "@/components/RichTextEditor";
import { OfferItem } from "@/types/offer";
import { Subcontractor } from "@/types/subcontractor";
import { SubcontractorDescription } from "@/types/subcontractor-description";
import { generateUUID } from "@/lib/utils";

const defaultIntro = "Bitte führen Sie die nachfolgend angeführten Leistungen gemäß Vereinbarung aus.";

export default function NewSubcontractorDescriptionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const offerId = searchParams.get("offerId") || "";
    const descriptionId = searchParams.get("descriptionId") || "";
    const { offers, isLoading: offersLoading } = useOffers();
    const { subcontractors, isLoading: subcontractorsLoading } = useSubcontractors();
    const { services } = useServices();
    const { descriptions, saveDescription, isLoading: descriptionsLoading } = useSubcontractorDescriptions();
    const { data: numberSettings, updateData: updateNumberSettings } = useSubcontractorSettings();
    const { showConfirm } = useNotification();

    const existingDescription = descriptions.find((entry) => entry.id === descriptionId);
    const sourceOfferId = existingDescription?.offerId || offerId;
    const offer = offers.find((entry) => entry.id === sourceOfferId);
    const [subcontractorId, setSubcontractorId] = React.useState("");
    const [showCustomer, setShowCustomer] = React.useState(false);
    const [introText, setIntroText] = React.useState(defaultIntro);
    const [project, setProject] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [items, setItems] = React.useState<OfferItem[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState<SubcontractorDescription | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (existingDescription) {
            setSaved(existingDescription);
            setSubcontractorId(existingDescription.subcontractorId);
            setShowCustomer(existingDescription.showCustomer);
            setIntroText(existingDescription.introText || defaultIntro);
            setProject(existingDescription.constructionProject || "");
            setNotes(existingDescription.notes || "");
            setItems(existingDescription.items || []);
        } else if (offer) {
            setProject(offer.constructionProject || "");
            setItems(offer.items?.length ? offer.items : [{
                id: generateUUID(),
                description: "",
                itemType: "standard",
                quantity: 1,
                unit: "Stk",
                pricePerUnit: 0,
                totalPrice: 0,
            }]);
        }
    }, [existingDescription, offer]);

    const subcontractor = subcontractors.find((entry) => entry.id === subcontractorId);
    const nextNumber = String(Math.max(1, Number(numberSettings.descriptionNextNumber) || 1));
    const padding = Math.max(1, Number(numberSettings.descriptionPadding) || 1);
    const number = saved?.documentNumber || `${numberSettings.descriptionPrefix || "LB-"}${new Date().getFullYear()}-${nextNumber.padStart(padding, "0")}`;

    const updateItem = (id: string, patch: Partial<OfferItem>) => {
        setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    };

    const addItem = (itemType: OfferItem["itemType"]) => {
        setItems((current) => [...current, {
            id: generateUUID(),
            title: itemType === "detailed" ? "" : undefined,
            description: "",
            itemType,
            quantity: 1,
            unit: "Stk",
            pricePerUnit: 0,
            totalPrice: 0,
        } as OfferItem]);
    };

    const removeItem = (id: string) => {
        setItems((current) => current.length > 1 ? current.filter((item) => item.id !== id) : current);
    };

    const applyTemplate = (id: string, serviceId: string) => {
        const service = services.find((entry) => entry.id === serviceId);
        if (service) updateItem(id, {
            title: service.title,
            description: service.description || service.title,
            unit: service.unit as OfferItem["unit"],
        });
    };

    const description: SubcontractorDescription = {
        id: saved?.id || "draft",
        documentNumber: number,
        offerId: offer?.id || sourceOfferId,
        offerNumber: offer?.offerNumber || existingDescription?.offerNumber,
        subcontractorId,
        subcontractorName: subcontractor?.name || existingDescription?.subcontractorName,
        subcontractorStreet: subcontractor?.street || existingDescription?.subcontractorStreet,
        subcontractorZip: subcontractor?.zip || existingDescription?.subcontractorZip,
        subcontractorCity: subcontractor?.city || existingDescription?.subcontractorCity,
        customerId: offer?.customerId || existingDescription?.customerId,
        customerName: offer?.customerName || existingDescription?.customerName,
        showCustomer,
        issueDate: existingDescription?.issueDate || new Date().toISOString().slice(0, 10),
        constructionProject: project,
        processor: offer?.processor || existingDescription?.processor || "-",
        introText,
        items,
        notes,
        status: saved?.status || "draft",
        createdAt: saved?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const save = async (finalize = false) => {
        if (!subcontractor) {
            setError("Bitte zuerst einen Subunternehmer auswählen.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const result = await saveDescription({ ...description, status: finalize ? "in_progress" : "draft" });
            setSaved(result);
            if (!saved) {
                await updateNumberSettings({ descriptionNextNumber: Number(numberSettings.descriptionNextNumber || 1) + 1 });
            }
            showConfirm({
                title: finalize ? "Leistungsbeschreibung finalisiert" : "Entwurf gespeichert",
                message: finalize
                    ? "Die Leistungsbeschreibung wurde finalisiert. Möchten Sie zur Übersicht wechseln oder hier bleiben?"
                    : "Die Leistungsbeschreibung wurde als Entwurf gespeichert. Möchten Sie zur Übersicht wechseln oder hier bleiben?",
                confirmLabel: "Zur Übersicht",
                cancelLabel: "Hier bleiben",
                variant: "primary",
                onConfirm: () => router.push("/subcontractor-descriptions"),
            });
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Leistungsbeschreibung konnte nicht gespeichert werden.");
        } finally {
            setSaving(false);
        }
    };

    if (offersLoading || subcontractorsLoading || descriptionsLoading) {
        return <main className="dashboard-page"><p className="font-bold text-slate-500">Leistungsbeschreibung wird geladen …</p></main>;
    }

    if (!offer) {
        return <main className="dashboard-page"><p className="font-bold text-slate-700">Das zugehörige Angebot wurde nicht gefunden.</p></main>;
    }

    return (
        <main className="dashboard-page-centered pb-24">
            <div className="mx-auto w-full max-w-[1600px]">
                <button onClick={() => router.push("/offers")} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600">
                    <ArrowLeft className="h-4 w-4" /> Angebotserstellung
                </button>
                <div className="mb-7">
                    <h1 className="text-5xl font-black tracking-tight text-slate-950">Neue Leistungsbeschreibung</h1>
                    <p className="mt-2 text-lg font-semibold text-slate-500">Erstellen Sie eine Leistungsbeschreibung für Ihren Subunternehmer.</p>
                </div>
                {error && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}

                <section className="mb-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
                    <div className="mb-4 flex items-center gap-3"><AlignLeft className="text-indigo-600" /><h2 className="text-xl font-black">Einleitungstext</h2></div>
                    <p className="mb-3 text-sm font-semibold text-slate-400">Dieser Text erscheint im PDF zwischen dem Kopfblock und den Leistungspositionen.</p>
                    <textarea rows={4} value={introText} onChange={(event) => setIntroText(event.target.value)} placeholder="Einleitungstext für den Subunternehmer …" className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                </section>

                <section className="mb-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
                    <div className="mb-4 flex items-center gap-3"><FileSignature className="text-indigo-600" /><div><h2 className="text-xl font-black">Optionen &amp; Dokumentbedingungen</h2><p className="text-sm font-semibold text-slate-400">Zusätzliche Angaben für dieses Dokument.</p></div></div>
                    <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-5 font-bold"><span><span className="block text-base">Kunde im Dokument anzeigen</span><span className="text-sm font-medium text-slate-400">Preise und Beträge des Kundenangebots werden niemals übernommen.</span></span><input type="checkbox" checked={showCustomer} onChange={(event) => setShowCustomer(event.target.checked)} className="h-5 w-5 accent-indigo-600" /></label>
                </section>

                <section className="mb-6 grid gap-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm lg:grid-cols-2">
                    <div><h2 className="mb-5 text-xl font-black">Subunternehmerdaten</h2><label className="block text-sm font-bold">Subunternehmer<select value={subcontractorId} onChange={(event) => setSubcontractorId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4"><option value="">Subunternehmer auswählen …</option>{subcontractors.map((entry: Subcontractor) => <option key={entry.id} value={entry.id}>{entry.name} ({entry.subcontractor_number || "ohne Nummer"})</option>)}</select></label></div>
                    <div><h2 className="mb-5 text-xl font-black">Leistungsbeschreibungsdaten</h2><label className="block text-sm font-bold">Dokumentnummer<input value={number} readOnly className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-indigo-700" /></label><label className="mt-4 block text-sm font-bold">Bauvorhaben / Projekt<input value={project} onChange={(event) => setProject(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" /></label></div>
                </section>

                <section className="mb-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-black">Leistungspositionen</h2><div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => addItem("title")} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white"><AlignLeft className="mr-1 inline h-3.5 w-3.5" /> Titel</button><button type="button" onClick={() => addItem("standard")} className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-white"><Plus className="mr-1 inline h-3.5 w-3.5" /> Position</button><button type="button" onClick={() => addItem("detailed")} className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-white"><Plus className="mr-1 inline h-3.5 w-3.5" /> Detail-Pos.</button><button type="button" onClick={() => addItem("info")} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white"><Info className="mr-1 inline h-3.5 w-3.5" /> Info</button></div></div>
                    <div className="space-y-3">{items.map((item, index) => { const type = item.itemType || "standard"; return <div key={item.id} className={`rounded-2xl border p-3 ${type === "title" ? "border-slate-200 bg-slate-50" : type === "info" ? "border-amber-100 bg-amber-50/40" : "border-slate-100"}`}><div className="flex items-start gap-3"><span className="mt-3 w-6 text-center text-xs font-black text-slate-400">{type === "title" || type === "info" ? "—" : index + 1}</span><div className="min-w-0 flex-1">{type === "title" ? <input value={item.title || item.description} onChange={(event) => updateItem(item.id, { title: event.target.value })} placeholder="Überschrift / Kapitel" className="w-full rounded-xl border border-slate-200 bg-slate-100 p-3 font-bold" /> : type === "info" ? <textarea rows={2} value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} placeholder="Informationstext / Hinweis …" className="w-full rounded-xl border border-amber-100 bg-transparent p-3" /> : <>{type === "detailed" && <input value={item.title || ""} onChange={(event) => updateItem(item.id, { title: event.target.value })} placeholder="Titel der Position" className="mb-2 w-full rounded-xl border border-slate-200 p-3 font-bold" />}<RichTextEditor value={item.description} onChange={(value) => updateItem(item.id, { description: value })} className="w-full" placeholder={type === "detailed" ? "Detaillierte Beschreibung (optional)" : "Positionsbeschreibung"} /><div className="mt-2 flex items-center gap-2"><select defaultValue="" onChange={(event) => applyTemplate(item.id, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><option value="">Vorlage auswählen …</option>{services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select><BookOpen className="h-4 w-4 text-slate-400" /></div></>}</div><button type="button" onClick={() => removeItem(item.id)} className="mt-1 rounded-xl p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>{type !== "title" && type !== "info" && <div className="flex items-center gap-3 pl-9 pt-2"><input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) || 0 })} className="w-24 rounded-xl border border-slate-200 p-2.5 text-center" /><select value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value as OfferItem["unit"] })} className="w-48 rounded-xl border border-slate-200 p-2.5"><option value="PA">PA (Pauschal)</option><option value="h">h (Stunden)</option><option value="Stk">Stk (Stück)</option><option value="m">m (Meter)</option><option value="Tag">Tag (Tage)</option></select></div>}</div>; })}</div>
                </section>

                <section className="mb-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm"><h2 className="mb-4 text-xl font-black">Notizen (intern)</h2><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Interne Hinweise zur Leistungsbeschreibung …" className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4" /></section>
                <div className="flex justify-end gap-4 rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"><button onClick={() => router.push("/offers")} className="rounded-2xl border border-slate-200 px-7 py-4 font-black text-slate-600">Abbrechen</button><button onClick={() => void save(false)} disabled={saving} className="rounded-2xl border border-slate-200 px-7 py-4 font-black text-slate-700 disabled:opacity-50">Als Entwurf speichern</button><button onClick={() => void save(true)} disabled={saving} className="flex items-center gap-2 rounded-2xl bg-primary-gradient px-8 py-4 font-black text-white shadow-lg disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Finalisieren &amp; Speichern</button></div>
            </div>
        </main>
    );
}
