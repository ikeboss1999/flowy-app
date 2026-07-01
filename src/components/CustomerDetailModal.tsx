"use client";

import React from "react";
import { X, User, Briefcase, Mail, Phone, MapPin, FileText, Clock, Calendar, Building2, CheckCircle2, ShieldAlert, Edit2, Trash2, Plus, ExternalLink } from "lucide-react";
import { Customer } from "@/types/customer";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { cn } from "@/lib/utils";

interface CustomerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer?: Customer;
    onUpdateCustomer?: (customer: Customer) => void;
}

export function CustomerDetailModal({ isOpen, onClose, customer, onUpdateCustomer }: CustomerDetailModalProps) {
    const { data: invoiceSettings } = useInvoiceSettings();
    const [isEditingNotes, setIsEditingNotes] = React.useState(false);
    const [editedNotesText, setEditedNotesText] = React.useState("");

    React.useEffect(() => {
        if (customer) {
            setEditedNotesText(customer.notes || "");
            setIsEditingNotes(false);
        }
    }, [customer]);

    if (!isOpen || !customer) return null;

    // Find payment term
    const paymentTerm = invoiceSettings.paymentTerms?.find(
        (term) => term.id === customer.defaultPaymentTermId
    );

    const handleSaveNotes = () => {
        if (!customer || !onUpdateCustomer) return;
        const updatedCustomer: Customer = {
            ...customer,
            notes: editedNotesText,
            updatedAt: new Date().toISOString()
        };
        onUpdateCustomer(updatedCustomer);
        setIsEditingNotes(false);
    };

    const handleDeleteNotes = () => {
        if (!customer || !onUpdateCustomer) return;
        const updatedCustomer: Customer = {
            ...customer,
            notes: "",
            updatedAt: new Date().toISOString()
        };
        onUpdateCustomer(updatedCustomer);
        setEditedNotesText("");
        setIsEditingNotes(false);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-[88rem] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row max-h-[95vh] md:max-h-[900px] animate-in zoom-in-95 duration-200">
                
                {/* Linkes Panel (Hero & Kontakt) - 30% Breite mit lebendigerem Farbverlauf */}
                <div className="md:w-[30%] bg-gradient-to-br from-[#1e1b4b] via-[#3b0764] to-[#4f46e5] text-slate-100 border-r border-white/5 p-8 flex flex-col justify-between relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 left-6 md:hidden p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white shadow-sm border border-white/10 bg-white/5"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="space-y-8 mt-4 md:mt-0">
                        {/* Profile Avatar & Name */}
                        <div className="space-y-4">
                            <div className={cn(
                                "h-16 w-16 rounded-2xl flex items-center justify-center border shadow-sm bg-white",
                                customer.type === 'private' 
                                    ? "bg-purple-500/10 border-purple-500/20 text-purple-600" 
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                            )}>
                                {customer.type === 'private' ? <User className="h-8 w-8" /> : <Briefcase className="h-8 w-8" />}
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-350 uppercase tracking-widest block mb-1">
                                    {customer.salutation || "Kunde"}
                                </span>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-snug break-words">
                                    {customer.name}
                                </h3>
                                {customer.customer_number && (
                                    <span className="text-xs font-bold text-indigo-200 bg-white/10 px-2.5 py-1 rounded-lg mt-2 inline-block border border-white/5">
                                        {customer.customer_number}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                                customer.type === 'private' ? "bg-white/10 text-purple-205 border-white/20" : "bg-white/10 text-emerald-205 border-white/20"
                            )}>
                                {customer.type === 'private' ? "Privat" : "Firma"}
                            </span>
                            <span className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                                customer.status === 'active' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                    customer.status === 'inactive' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            )}>
                                <span className={cn("h-1.5 w-1.5 rounded-full",
                                    customer.status === 'active' ? "bg-emerald-400 animate-pulse" :
                                        customer.status === 'inactive' ? "bg-amber-400" : "bg-rose-400"
                                )} />
                                {customer.status === 'active' ? 'Aktiv' : customer.status === 'inactive' ? 'Inaktiv' : 'Gesperrt'}
                            </span>
                        </div>

                        <hr className="border-white/10" />

                        {/* Quick Contacts */}
                        <div className="space-y-5">
                            <div>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block mb-1.5">E-Mail-Adresse</span>
                                <div className="flex items-center gap-2 text-slate-200 justify-between">
                                    <div className="flex items-center gap-2.5 text-slate-200 min-w-0 flex-1">
                                        <Mail className="h-4.5 w-4.5 text-slate-300 shrink-0" />
                                        <span className="text-sm font-semibold truncate" title={customer.email}>{customer.email || "-"}</span>
                                    </div>
                                    {customer.email && (
                                        <a
                                            href={`mailto:${customer.email}`}
                                            className="p-1 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition-colors shrink-0"
                                            title="E-Mail schreiben"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block mb-1.5">Telefonnummer</span>
                                <div className="flex items-center gap-2.5 text-slate-200">
                                    <Phone className="h-4.5 w-4.5 text-slate-300 shrink-0" />
                                    <span className="text-sm font-semibold">{customer.phone || "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata am Fuß des linken Panels */}
                    <div className="pt-6 border-t border-white/10 hidden md:block">
                        <div className="space-y-2 text-[11px] font-semibold text-slate-350">
                            <div className="flex justify-between">
                                <span>Kunde seit:</span>
                                <span className="text-slate-200">{new Date(customer.createdAt).toLocaleDateString('de-DE')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Aktivität:</span>
                                <span className="text-slate-200">
                                    {customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString('de-DE') : 'Keine'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rechtes Panel (Detaillierte Infos) - 70% Breite */}
                <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto relative bg-white">
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 right-6 hidden md:flex p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 bg-white"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {/* Übersichtlicheres 2-Spalten-Raster für Infos */}
                    <div className="space-y-8 flex-1 flex flex-col justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Spalte 1: Adresse */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" /> Postanschrift
                                </h4>
                                <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[100px] flex flex-col justify-center">
                                    <p className="text-[15px] font-bold text-slate-800 leading-snug">
                                        {customer.address.street || "Keine Straße angegeben"}
                                    </p>
                                    <p className="text-[13px] font-semibold text-slate-500 mt-1">
                                        {customer.address.zip || ""} {customer.address.city || "Kein Ort angegeben"}
                                    </p>
                                </div>
                            </div>

                            {/* Spalte 2: Konditionen */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" /> Zahlungskonditionen
                                </h4>
                                <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[100px] flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Standard-Frist</span>
                                    <p className="text-[15px] font-bold text-slate-800">
                                        {paymentTerm ? `${paymentTerm.name} (${paymentTerm.days} Tage)` : "Globaler Standard (Einstellungen)"}
                                    </p>
                                </div>
                            </div>

                            {/* Spalte 3: Registrierungsdetails (nur Business) oder Platzhalter */}
                            {customer.type === 'business' ? (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5" /> Registrierungsdetails
                                    </h4>
                                    <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">UID-Nummer</span>
                                                <span className="text-[14px] font-bold text-slate-800">{customer.taxId || "-"}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Firmenbuch</span>
                                                <span className="text-[14px] font-bold text-slate-800">{customer.commercialRegisterNumber || "-"}</span>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-500">Reverse Charge</span>
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 border",
                                                customer.reverseChargeEnabled 
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                            )}>
                                                {customer.reverseChargeEnabled ? (
                                                    <>
                                                        <CheckCircle2 className="h-3 w-3" /> Berechtigt
                                                    </>
                                                ) : "Nein"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" /> Systemdaten
                                    </h4>
                                    <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 space-y-3.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 uppercase tracking-wider">Kunde seit:</span>
                                            <span className="font-bold text-slate-700">{new Date(customer.createdAt).toLocaleDateString('de-DE')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                                            <span className="font-bold text-slate-400 uppercase tracking-wider">Aktivität:</span>
                                            <span className="font-bold text-slate-700">
                                                {customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString('de-DE') : 'Keine'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Spalte 4: Systemdaten für Business-Kunden (für Privatkunden bereits oben belegt) */}
                            {customer.type === 'business' && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" /> Systemdaten
                                    </h4>
                                    <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 space-y-3.5 min-h-[135px] flex flex-col justify-center">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 uppercase tracking-wider">Kunde seit:</span>
                                            <span className="font-bold text-slate-700">{new Date(customer.createdAt).toLocaleDateString('de-DE')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                                            <span className="font-bold text-slate-400 uppercase tracking-wider">Aktivität:</span>
                                            <span className="font-bold text-slate-700">
                                                {customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString('de-DE') : 'Keine'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Zeile unten: Bemerkungen (immer volle Breite) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> Interne Bemerkungen
                                </h4>
                                {!isEditingNotes && customer.notes && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsEditingNotes(true)}
                                            className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100"
                                            title="Bearbeiten"
                                        >
                                            <Edit2 className="h-3 w-3" /> Bearbeiten
                                        </button>
                                        <button
                                            onClick={handleDeleteNotes}
                                            className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100"
                                            title="Löschen"
                                        >
                                            <Trash2 className="h-3 w-3" /> Löschen
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {isEditingNotes ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={editedNotesText}
                                        onChange={(e) => setEditedNotesText(e.target.value)}
                                        rows={3}
                                        placeholder="Bemerkung eingeben..."
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-medium text-sm resize-none text-slate-700"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setIsEditingNotes(false);
                                                setEditedNotesText(customer.notes || "");
                                            }}
                                            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs transition-colors"
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            onClick={handleSaveNotes}
                                            className="px-4 py-1.5 bg-primary-gradient text-white rounded-xl font-bold text-xs shadow-md shadow-purple-500/20 hover:opacity-95 transition-all active:scale-95 duration-100"
                                        >
                                            Speichern
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[90px] flex flex-col justify-between items-start">
                                    <p className="text-sm font-semibold text-slate-650 leading-relaxed whitespace-pre-line w-full text-left">
                                        {customer.notes || "Keine Notizen zu diesem Kunden hinterlegt."}
                                    </p>
                                    {!customer.notes && (
                                        <div className="mt-3 flex justify-start">
                                            <button
                                                onClick={() => setIsEditingNotes(true)}
                                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-all bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl"
                                            >
                                                <Plus className="h-3 w-3" /> Bemerkung hinzufügen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Close Button */}
                    <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-primary-gradient text-white rounded-xl font-bold hover:opacity-95 transition-all text-xs tracking-wide shadow-md shadow-purple-500/20 active:scale-95 duration-150"
                        >
                            Schließen
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
