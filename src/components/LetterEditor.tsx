"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Save, Download, FileArchive, Loader2, Plus, Sparkles, Building2, User } from "lucide-react";
import { Letter } from "@/types/letter";
import { useLetters } from "@/hooks/useLetters";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useArchiveFiles } from "@/hooks/useArchiveFiles";
import { useNotification } from "@/context/NotificationContext";
import { CustomerSearchSelect } from "@/components/CustomerSearchSelect";
import { CustomerModal } from "@/components/CustomerModal";
import { LetterPDF } from "@/components/LetterPDF";
import { Customer } from "@/types/customer";

interface LetterEditorProps {
    initialLetter?: Letter;
}

export function LetterEditor({ initialLetter }: LetterEditorProps) {
    const router = useRouter();
    const { addLetter, updateLetter } = useLetters();
    const { customers, addCustomer } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { uploadFile } = useArchiveFiles();
    const { showToast } = useNotification();

    const isEdit = !!initialLetter;

    // Form States
    const [customerId, setCustomerId] = useState<string>(initialLetter?.customerId || "");
    const [recipientName, setRecipientName] = useState(initialLetter?.recipientName || "");
    const [recipientAddress, setRecipientAddress] = useState(initialLetter?.recipientAddress || "");
    const [date, setDate] = useState(initialLetter?.date ? initialLetter.date.substring(0, 10) : new Date().toISOString().substring(0, 10));
    const [city, setCity] = useState(initialLetter?.city || companySettings?.city || "Wien");
    const [subject, setSubject] = useState(initialLetter?.subject || "");
    const [salutation, setSalutation] = useState(initialLetter?.salutation || "Sehr geehrte Damen und Herren,");
    const [bodyText, setBodyText] = useState(initialLetter?.bodyText || "");
    const [signOff, setSignOff] = useState(initialLetter?.signOff || "Mit freundlichen Grüßen");

    // UI States
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    // Sync city default from company settings when loaded
    useEffect(() => {
        if (!initialLetter && companySettings?.city && !city) {
            setCity(companySettings.city);
        }
    }, [companySettings, initialLetter]);

    // Handle customer selection
    const handleSelectCustomer = (selectedId: string) => {
        setCustomerId(selectedId);
        const customer = customers.find(c => c.id === selectedId);
        if (customer) {
            // Autocomplete recipient name and address
            setRecipientName(customer.name);
            const addressString = `${customer.address.street}\n${customer.address.zip} ${customer.address.city}`;
            setRecipientAddress(addressString);

            // Auto-salutation
            const parts = customer.name.split(' ');
            const lastName = parts.length > 1 ? parts[parts.length - 1] : customer.name;
            if (customer.type === 'business') {
                setSalutation("Sehr geehrte Damen und Herren,");
            } else if (customer.salutation === 'Herr') {
                setSalutation(`Sehr geehrter Herr ${lastName},`);
            } else if (customer.salutation === 'Frau') {
                setSalutation(`Sehr geehrte Frau ${lastName},`);
            } else {
                setSalutation("Sehr geehrte Damen und Herren,");
            }
        }
    };

    const handleCreateCustomer = (newCustomer: Customer) => {
        addCustomer(newCustomer);
        setIsCustomerModalOpen(false);
        // Automatically select the newly created customer
        setTimeout(() => {
            handleSelectCustomer(newCustomer.id);
        }, 100);
    };

    // Helper to compile letter object
    const getLetterData = (): Omit<Letter, "id" | "userId" | "createdAt" | "updatedAt"> => {
        return {
            customerId: customerId || undefined,
            recipientName,
            recipientAddress,
            date,
            city,
            subject,
            salutation,
            bodyText,
            signOff
        };
    };

    const handleSave = async () => {
        if (!recipientName || !recipientAddress || !subject || !bodyText) {
            showToast("Bitte füllen Sie alle erforderlichen Felder aus.", "error");
            return;
        }

        setIsSaving(true);
        try {
            if (isEdit && initialLetter) {
                await updateLetter(initialLetter.id, getLetterData());
            } else {
                await addLetter(getLetterData() as any);
            }

            // Automatically generate and archive the PDF file under folder "Briefe"
            try {
                const blob = await generatePDFBlob();
                const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
                const fileName = `Brief_${safeSubject || 'Dokument'}_${new Date().toISOString().substring(0, 10)}.pdf`;
                const file = new File([blob], fileName, { type: "application/pdf" });
                await uploadFile(file, "Briefe");
            } catch (pdfErr) {
                console.error("Automatisches PDF-Archivieren fehlgeschlagen:", pdfErr);
            }

            if (isEdit && initialLetter) {
                showToast("Brief erfolgreich aktualisiert und im Archiv gespeichert.", "success");
            } else {
                showToast("Brief erfolgreich erstellt und im Archiv gespeichert.", "success");
            }
            router.push("/letters");
        } catch (e) {
            console.error(e);
            showToast("Fehler beim Speichern.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Generate binary PDF helper
    const generatePDFBlob = async () => {
        if (!companySettings) {
            throw new Error("Firmen-Einstellungen werden noch geladen...");
        }
        const { pdf } = await import("@react-pdf/renderer");
        const { LetterReactPDF } = await import("@/components/LetterReactPDF");
        const mockLetter: Letter = {
            id: initialLetter?.id || "temp",
            userId: initialLetter?.userId || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...getLetterData()
        };
        return pdf(
            React.createElement(LetterReactPDF, { letter: mockLetter, companySettings }) as any
        ).toBlob();
    };

    const handleExportPDF = async () => {
        if (!recipientName || !subject || !bodyText) {
            showToast("Bitte füllen Sie Empfänger, Betreff und Text aus.", "error");
            return;
        }

        setIsExporting(true);
        try {
            const blob = await generatePDFBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
            a.download = `Brief_${safeSubject || 'Dokument'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("PDF-Download erfolgreich gestartet.", "success");
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Fehler beim Exportieren des PDFs.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    const handleArchivePDF = async () => {
        if (!recipientName || !subject || !bodyText) {
            showToast("Bitte füllen Sie Empfänger, Betreff und Text aus.", "error");
            return;
        }

        setIsArchiving(true);
        try {
            const blob = await generatePDFBlob();
            const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
            const fileName = `Brief_${safeSubject || 'Dokument'}_${new Date().toISOString().substring(0, 10)}.pdf`;
            const file = new File([blob], fileName, { type: "application/pdf" });

            // Upload directly to '__archive__' project, folder 'Briefe'
            await uploadFile(file, "Briefe");
            showToast(`Brief erfolgreich im Dokumenten-Archiv unter 'Briefe' gespeichert!`, "success");
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Fehler beim Archivieren des PDFs.", "error");
        } finally {
            setIsArchiving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen">
            {/* Header toolbar */}
            <div className="bg-white border-b border-slate-100 px-10 py-5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/letters")}
                        className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest block">Büro & Briefverkehr</span>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight font-outfit">
                            {isEdit ? "Brief bearbeiten" : "Neuen Brief schreiben"}
                        </h1>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting || isSaving || isArchiving}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-indigo-500" />}
                        PDF Exportieren
                    </button>

                    <button
                        onClick={handleArchivePDF}
                        disabled={isExporting || isSaving || isArchiving}
                        className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-100/80 disabled:opacity-50 transition-all border border-indigo-100/50"
                    >
                        {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4 text-indigo-500" />}
                        Im Archiv sichern
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isExporting || isSaving || isArchiving}
                        className="px-6 py-2.5 bg-primary-gradient text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/10"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Brief Speichern
                    </button>
                </div>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-y-auto bg-slate-50">
                {/* Left Side: Form Inputs */}
                <div className="p-10 space-y-8 overflow-y-auto max-h-[calc(100vh-85px)] border-r border-slate-100 scrollbar-thin scrollbar-thumb-slate-200 bg-white">
                    {/* Section: Empfänger-Auswahl */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" /> 1. Empfänger wählen
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <label className="text-xs font-bold text-slate-500 block">Kunde aus Datenbank verknüpfen (optional)</label>
                            <CustomerSearchSelect
                                customers={customers}
                                selectedId={customerId}
                                onSelect={handleSelectCustomer}
                                onAddNew={() => setIsCustomerModalOpen(true)}
                                placeholder="Kundendatenbank durchsuchen..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">Empfänger Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    placeholder="z.B. Max Mustermann"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">Ort der Ausstellung *</label>
                                <input
                                    type="text"
                                    required
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="z.B. Wien"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Empfänger Adresse *</label>
                            <textarea
                                rows={3}
                                required
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder="Musterstraße 12&#10;1234 Musterstadt"
                                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800 resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Datum *</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Section: Inhalt */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> 2. Briefinhalt
                        </h2>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Betreff *</label>
                            <input
                                type="text"
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="z.B. Auftragsbestätigung Projekt XY"
                                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500">Anrede *</label>
                                <div className="flex gap-1">
                                    {["Sehr geehrte Damen und Herren,", "Sehr geehrter Herr", "Sehr geehrte Frau"].map((tpl) => (
                                        <button
                                            key={tpl}
                                            type="button"
                                            onClick={() => setSalutation(tpl === "Sehr geehrte Damen und Herren," ? tpl : `${tpl} [Nachname],`)}
                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all"
                                        >
                                            {tpl.replace("Sehr geehrte", "").replace("Sehr geehrter", "").trim() || "Standard"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="text"
                                required
                                value={salutation}
                                onChange={(e) => setSalutation(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Brieftext (Absätze per Enter) *</label>
                            <textarea
                                rows={10}
                                required
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                placeholder="Schreiben Sie hier Ihren Brieftext..."
                                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-700 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500">Grußformel *</label>
                                <div className="flex gap-1">
                                    {["Mit freundlichen Grüßen", "Beste Grüße", "Herzliche Grüße"].map((tpl) => (
                                        <button
                                            key={tpl}
                                            type="button"
                                            onClick={() => setSignOff(tpl)}
                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all"
                                        >
                                            {tpl}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="text"
                                required
                                value={signOff}
                                onChange={(e) => setSignOff(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side: Live preview */}
                <div className="p-10 overflow-y-auto max-h-[calc(100vh-85px)] flex justify-center scrollbar-thin scrollbar-thumb-slate-200 bg-slate-100">
                    <div className="w-full max-w-[210mm] scale-[0.9] lg:scale-[0.95] origin-top transform-gpu">
                        <div className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center mb-4 flex items-center justify-center gap-1.5">
                            Live DIN A4 Vorschau
                        </div>
                        {companySettings ? (
                            <LetterPDF
                                letter={{
                                    id: initialLetter?.id || "temp",
                                    userId: initialLetter?.userId || "",
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                    ...getLetterData()
                                }}
                                companySettings={companySettings}
                            />
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p className="text-sm font-medium">Lade Firmen-Einstellungen...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer Add Modal */}
            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleCreateCustomer}
                existingCustomers={customers}
            />
        </div>
    );
}
