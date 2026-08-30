"use client";

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bold, CheckCircle2, ChevronDown, ImagePlus, Italic, Link, List, Mail, Send, ShieldCheck, Trash2, Underline } from 'lucide-react';
import { useEmailSettings } from '@/hooks/useEmailSettings';
import { cn } from '@/lib/utils';
import { htmlToPlainText, plainTextToHtml, sanitizeEmailHtml } from '@/lib/email-html';

function RichSignatureEditor({ value, fallbackText, onChange }: { value?: string; fallbackText?: string; onChange: (html: string) => void }) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [hasFocus, setHasFocus] = useState(false);
    const htmlValue = value || plainTextToHtml(fallbackText || '');

    useEffect(() => {
        if (!editorRef.current || hasFocus) return;
        editorRef.current.innerHTML = sanitizeEmailHtml(htmlValue);
    }, [hasFocus, htmlValue]);

    const emitChange = () => {
        if (!editorRef.current) return;
        onChange(sanitizeEmailHtml(editorRef.current.innerHTML));
    };

    const runCommand = (command: string, commandValue?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, commandValue);
        emitChange();
    };

    const addLink = () => {
        const url = window.prompt('Link einfuegen');
        if (!url) return;
        runCommand('createLink', /^https?:\/\//i.test(url) ? url : `https://${url}`);
    };

    const handleImageUpload = (file?: File) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            editorRef.current?.focus();
            document.execCommand('insertHTML', false, `<img src="${String(reader.result || '')}" alt="" style="max-width:180px;height:auto;display:block;margin:8px 0;" />`);
            emitChange();
        };
        reader.readAsDataURL(file);
    };

    const buttonClass = "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600";

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 p-2">
                <button type="button" className={buttonClass} title="Fett" onClick={() => runCommand('bold')}><Bold className="h-4 w-4" /></button>
                <button type="button" className={buttonClass} title="Kursiv" onClick={() => runCommand('italic')}><Italic className="h-4 w-4" /></button>
                <button type="button" className={buttonClass} title="Unterstrichen" onClick={() => runCommand('underline')}><Underline className="h-4 w-4" /></button>
                <button type="button" className={buttonClass} title="Liste" onClick={() => runCommand('insertUnorderedList')}><List className="h-4 w-4" /></button>
                <button type="button" className={buttonClass} title="Link" onClick={addLink}><Link className="h-4 w-4" /></button>
                <button type="button" className={buttonClass} title="Bild oder Logo" onClick={() => fileInputRef.current?.click()}><ImagePlus className="h-4 w-4" /></button>
                <select className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 outline-none" defaultValue="" onChange={(e) => e.target.value && runCommand('fontName', e.target.value)}>
                    <option value="" disabled>Schrift</option>
                    <option value="Arial">Arial</option>
                    <option value="Calibri">Calibri</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times</option>
                </select>
                <select className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 outline-none" defaultValue="" onChange={(e) => e.target.value && runCommand('fontSize', e.target.value)}>
                    <option value="" disabled>Groesse</option>
                    <option value="2">Klein</option>
                    <option value="3">Normal</option>
                    <option value="4">Gross</option>
                </select>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
            </div>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={() => setHasFocus(true)}
                onBlur={() => {
                    setHasFocus(false);
                    emitChange();
                }}
                onInput={emitChange}
                className="min-h-[220px] bg-white px-4 py-3 text-sm font-medium leading-relaxed text-slate-800 outline-none [&_img]:max-w-full"
            />
        </div>
    );
}

function SettingsSection({
    title,
    description,
    icon: Icon,
    isOpen,
    onToggle,
    badge,
    children,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    badge?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-slate-50/70"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{title}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {badge}
                    <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-slate-100 p-6">
                    {children}
                </div>
            )}
        </div>
    );
}

export function EmailDeliverySettings() {
    const { delivery, logs, updateDelivery, deleteConnection, isLoading, refresh } = useEmailSettings();
    const [smtpPassword, setSmtpPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [openSection, setOpenSection] = useState<string | null>(null);

    if (isLoading) return <div className="p-8 text-slate-400 font-bold">Laden...</div>;

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await updateDelivery({ ...delivery, smtpPassword: smtpPassword || undefined });
            setSmtpPassword('');
            setMessage({ type: 'success', text: 'E-Mail Versand wurde gespeichert.' });
        } catch {
            setMessage({ type: 'error', text: 'Einstellungen konnten nicht gespeichert werden.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setMessage(null);
        try {
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'test' }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Testmail fehlgeschlagen.');
            }
            setMessage({ type: 'success', text: 'Testmail wurde versendet.' });
            refresh();
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.message || 'Testmail fehlgeschlagen.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleConnectionTest = async () => {
        setIsTestingConnection(true);
        setMessage(null);
        try {
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'connection-test' }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Verbindungstest fehlgeschlagen.');
            }
            setMessage({ type: 'success', text: 'SMTP-Verbindung und Login sind korrekt.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.message || 'Verbindungstest fehlgeschlagen.' });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleDeleteConnection = async () => {
        const confirmed = window.confirm('SMTP-Anbindung wirklich loeschen? Das Versandprotokoll bleibt erhalten.');
        if (!confirmed) return;

        setIsDeleting(true);
        setMessage(null);
        try {
            await deleteConnection();
            setSmtpPassword('');
            setMessage({ type: 'success', text: 'SMTP-Anbindung wurde geloescht.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.message || 'SMTP-Anbindung konnte nicht geloescht werden.' });
        } finally {
            setIsDeleting(false);
        }
    };

    const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-bold";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";
    const configured = !!delivery.smtpHost && !!delivery.smtpUser && !!delivery.fromEmail && !!delivery.hasSmtpPassword;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-10 p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">E-Mail Versand</h2>
                    <p className="text-sm font-semibold text-slate-500">SMTP, Signatur und Versandprotokoll.</p>
                </div>
            </div>

            {message && (
                <div className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold",
                    message.type === 'success'
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-rose-200 bg-rose-50 text-rose-800"
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            <SettingsSection
                title="SMTP Einstellungen"
                description="SMTP-Daten für den Versand aus FlowY."
                icon={ShieldCheck}
                isOpen={openSection === 'smtp'}
                onToggle={() => setOpenSection(openSection === 'smtp' ? null : 'smtp')}
                badge={(
                    <span className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                        configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {configured ? 'Eingerichtet' : 'Unvollstaendig'}
                    </span>
                )}
            >

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                        <label className={labelClasses}>SMTP Host</label>
                        <input value={delivery.smtpHost} onChange={(e) => updateDelivery({ smtpHost: e.target.value })} className={inputClasses} placeholder="smtp.mail.com" />
                    </div>
                    <div className="grid grid-cols-[1fr_160px] gap-3">
                        <div>
                            <label className={labelClasses}>Port</label>
                            <input type="number" value={delivery.smtpPort} onChange={(e) => updateDelivery({ smtpPort: Number(e.target.value) })} className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Sicherheit</label>
                            <select value={delivery.smtpSecurity} onChange={(e) => updateDelivery({ smtpSecurity: e.target.value as any })} className={inputClasses}>
                                <option value="starttls">STARTTLS</option>
                                <option value="ssl">SSL/TLS</option>
                                <option value="none">Keine</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>SMTP Benutzer</label>
                        <input value={delivery.smtpUser} onChange={(e) => updateDelivery({ smtpUser: e.target.value })} className={inputClasses} placeholder="office@firma.at" />
                    </div>
                    <div>
                        <label className={labelClasses}>SMTP Passwort</label>
                        <input
                            type="password"
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            className={inputClasses}
                            placeholder={delivery.hasSmtpPassword ? "Gespeichertes Passwort bleibt erhalten" : "Passwort eingeben"}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Absendername</label>
                        <input value={delivery.fromName} onChange={(e) => updateDelivery({ fromName: e.target.value })} className={inputClasses} placeholder="Firma GmbH" />
                    </div>
                    <div>
                        <label className={labelClasses}>Absender E-Mail</label>
                        <input type="email" value={delivery.fromEmail} onChange={(e) => updateDelivery({ fromEmail: e.target.value })} className={inputClasses} placeholder="office@firma.at" />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelClasses}>Antwort-an E-Mail</label>
                        <input type="email" value={delivery.replyToEmail || ''} onChange={(e) => updateDelivery({ replyToEmail: e.target.value })} className={inputClasses} placeholder="Optional" />
                    </div>
                    <label className="md:col-span-2 flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/40">
                        <input
                            type="checkbox"
                            checked={!!delivery.sendCopyToSelf}
                            onChange={(e) => void updateDelivery({ sendCopyToSelf: e.target.checked })}
                            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>
                            <span className="block text-sm font-black text-slate-800">Kopie an mich selbst senden</span>
                            <span className="mt-1 block text-xs font-semibold text-slate-500">
                                Bei jedem Dokumentenversand wird automatisch eine Blindkopie an {delivery.fromEmail || 'die Absenderadresse'} gesendet.
                            </span>
                        </span>
                    </label>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button onClick={handleDeleteConnection} disabled={isDeleting || !configured} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-rose-600 ring-1 ring-rose-200 transition-all hover:bg-rose-50 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                        {isDeleting ? 'Loescht...' : 'Anbindung loeschen'}
                    </button>
                    <button onClick={handleConnectionTest} disabled={isTestingConnection || !configured} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50 disabled:opacity-50">
                        <ShieldCheck className="h-4 w-4" />
                        {isTestingConnection ? 'Prüft...' : 'Verbindung testen'}
                    </button>
                    <button onClick={handleTest} disabled={isTesting || !configured} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-200 disabled:opacity-50">
                        <Send className="h-4 w-4" />
                        {isTesting ? 'Sendet...' : 'Testmail senden'}
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:opacity-50">
                        <CheckCircle2 className="h-4 w-4" />
                        {isSaving ? 'Speichert...' : 'Speichern'}
                    </button>
                </div>
            </SettingsSection>

            <SettingsSection
                title="E-Mail Signatur"
                description="Signatur getrennt pflegen, inkl. Formatierung, Links und Bildern."
                icon={Mail}
                isOpen={openSection === 'signature'}
                onToggle={() => setOpenSection(openSection === 'signature' ? null : 'signature')}
            >
                <div className="space-y-5">
                    <div>
                        <label className={labelClasses}>E-Mail Signatur</label>
                        <textarea
                            rows={4}
                            value={delivery.signature}
                            onChange={(e) => updateDelivery({ signature: e.target.value, signatureHtml: plainTextToHtml(e.target.value) })}
                            className={cn(inputClasses, "resize-y whitespace-pre-wrap")}
                            placeholder={"Mit freundlichen Gruessen\nFirma GmbH"}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Signatur Editor</label>
                        <RichSignatureEditor
                            value={delivery.signatureHtml}
                            fallbackText={delivery.signature}
                            onChange={(html) => updateDelivery({ signatureHtml: html, signature: htmlToPlainText(html) })}
                        />
                        <p className="mt-2 text-xs font-semibold text-slate-400">Formatierungen, kopierte Signaturen, Links und Bilder werden als HTML-Mail uebernommen.</p>
                    </div>
                    <div className="flex justify-end border-t border-slate-100 pt-5">
                        <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:opacity-50">
                            <CheckCircle2 className="h-4 w-4" />
                            {isSaving ? 'Speichert...' : 'Signatur speichern'}
                        </button>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection
                title="Versandprotokoll"
                description="Gesendete Dokumente und Testmails nachvollziehen."
                icon={Send}
                isOpen={openSection === 'logs'}
                onToggle={() => setOpenSection(openSection === 'logs' ? null : 'logs')}
                badge={<span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{logs.length} Eintraege</span>}
            >
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-sm font-semibold text-slate-400">Noch keine E-Mails versendet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {logs.slice(0, 30).map(log => (
                                <div key={log.id} className="grid gap-2 p-4 md:grid-cols-[120px_1fr_220px_100px] md:items-center">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">{log.documentType}</span>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">#{log.documentNumber} - {log.subject}</p>
                                        <p className="text-xs font-semibold text-slate-400">{log.recipient}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">{new Date(log.sentAt).toLocaleString('de-DE')}</span>
                                    <span className={cn("rounded-full px-3 py-1 text-center text-[10px] font-black uppercase tracking-wider", log.status === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                                        {log.status === 'success' ? 'Gesendet' : 'Fehler'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SettingsSection>
        </div>
    );
}
