"use client";

import React, { useState, useMemo } from "react";
import { 
    KeyRound, 
    Plus, 
    Search, 
    Lock, 
    Eye, 
    EyeOff, 
    Copy, 
    ExternalLink, 
    Trash2, 
    Edit3, 
    X, 
    Check, 
    RefreshCw, 
    Sparkles, 
    Tags,
    Tag,
    AlertCircle
} from "lucide-react";
import { useCredentials } from "@/hooks/useCredentials";
import { PinLockScreen } from "@/components/PinLockScreen";
import { Credential } from "@/types/credential";
import { cn } from "@/lib/utils";
import { useNotification } from "@/context/NotificationContext";
import { nanoid } from "nanoid";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

export default function CredentialsPage() {
    usePermissionGuard(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const { credentials = [], addCredential, updateCredential, deleteCredential, isLoading } = useCredentials();
    const { showToast } = useNotification();

    // UI States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [credentialToDeleteId, setCredentialToDeleteId] = useState<string | null>(null);

    // Form States
    const [formTitle, setFormTitle] = useState("");
    const [formUrl, setFormUrl] = useState("");
    const [formUsername, setFormUsername] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formTags, setFormTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");

    // Lock the credentials vault
    const handleLock = () => {
        setIsUnlocked(false);
        showToast("Tresor gesperrt", "info");
    };

    // Toggle password visibility
    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Copy to Clipboard helper
    const copyToClipboard = async (text: string, field: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStates(prev => ({ ...prev, [`${id}-${field}`]: true }));
            showToast(`${field} in Zwischenablage kopiert`, "success");
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [`${id}-${field}`]: false }));
            }, 2000);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            showToast("Fehler beim Kopieren", "error");
        }
    };

    // Generate strong password
    const handleGeneratePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
        let pwd = "";
        for (let i = 0; i < 16; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormPassword(pwd);
        showToast("Sicheres Passwort generiert", "success");
    };

    // Open modal to add new
    const handleOpenAddModal = () => {
        setEditingCredential(null);
        setFormTitle("");
        setFormUrl("");
        setFormUsername("");
        setFormPassword("");
        setFormNotes("");
        setFormTags([]);
        setTagInput("");
        setIsModalOpen(true);
    };

    // Open modal to edit existing
    const handleOpenEditModal = (cred: Credential) => {
        setEditingCredential(cred);
        setFormTitle(cred.title);
        setFormUrl(cred.url || "");
        setFormUsername(cred.username);
        setFormPassword(cred.password || "");
        setFormNotes(cred.notes || "");
        setFormTags(cred.tags || []);
        setTagInput("");
        setIsModalOpen(true);
    };

    // Save Credential
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle || !formUsername || !formPassword) {
            showToast("Bitte Titel, Benutzername und Passwort ausfüllen", "error");
            return;
        }

        try {
            const dataToSave = {
                title: formTitle,
                url: formUrl,
                username: formUsername,
                password: formPassword,
                notes: formNotes,
                tags: formTags
            };

            if (editingCredential) {
                await updateCredential(editingCredential.id, dataToSave);
                showToast("Eintrag erfolgreich aktualisiert", "success");
            } else {
                await addCredential({
                    id: nanoid(),
                    userId: "", // Will be set by useResourceFactory endpoint
                    ...dataToSave
                });
                showToast("Eintrag erfolgreich erstellt", "success");
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Save failed:", err);
            showToast("Fehler beim Speichern", "error");
        }
    };

    // Delete Credential
    const handleDelete = (id: string) => {
        setCredentialToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!credentialToDeleteId) return;
        try {
            await deleteCredential(credentialToDeleteId);
            showToast("Eintrag gelöscht", "info");
        } catch (err) {
            console.error("Delete failed:", err);
            showToast("Fehler beim Löschen", "error");
        } finally {
            setIsDeleteModalOpen(false);
            setCredentialToDeleteId(null);
        }
    };

    // Tag management in Form
    const handleAddTag = () => {
        const cleanTag = tagInput.trim().toLowerCase();
        if (cleanTag && !formTags.includes(cleanTag)) {
            setFormTags(prev => [...prev, cleanTag]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormTags(prev => prev.filter(t => t !== tagToRemove));
    };

    // Extract all unique tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        credentials.forEach(c => {
            if (c.tags) {
                c.tags.forEach(t => tags.add(t));
            }
        });
        return Array.from(tags).sort();
    }, [credentials]);

    // Filtered credentials list
    const filteredCredentials = useMemo(() => {
        return credentials.filter(c => {
            const matchesSearch = 
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.url && c.url.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesTag = !selectedTag || (c.tags && c.tags.includes(selectedTag));

            return matchesSearch && matchesTag;
        });
    }, [credentials, searchQuery, selectedTag]);

    // Render PIN-Lock if not unlocked
    if (!isUnlocked) {
        return <PinLockScreen onUnlock={() => setIsUnlocked(true)} />;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">
                        <KeyRound className="h-4 w-4 text-indigo-500" />
                        Sicherheit & Zugänge
                    </div>
                    <h1 className="text-3xl xl:text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Zugangsdaten
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Verwalte deine Passwörter und Anmeldungen sicher verschlüsselt.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLock}
                        className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
                        title="Tresor sperren"
                    >
                        <Lock className="h-4 w-4" />
                        Sperren
                    </button>
                    <button
                        onClick={handleOpenAddModal}
                        className="gradient-button flex items-center gap-2 shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-95 transition-all text-sm font-bold py-3.5"
                    >
                        <Plus className="h-4 w-4" />
                        Zugang hinzufügen
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                
                {/* Sidebar Filter */}
                <div className="glass-card p-6 space-y-6">
                    <div>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Tags className="h-3.5 w-3.5 text-slate-400" />
                            Kategorie / Tags
                        </h2>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => setSelectedTag(null)}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-left transition-all",
                                    !selectedTag 
                                        ? "bg-indigo-50 text-indigo-600" 
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <span>Alle anzeigen</span>
                                <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-400">
                                    {credentials.length}
                                </span>
                            </button>
                            {allTags.map(tag => {
                                const count = credentials.filter(c => c.tags?.includes(tag)).length;
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTag(tag)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-left transition-all capitalize",
                                            selectedTag === tag 
                                                ? "bg-indigo-50 text-indigo-600" 
                                                : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-3.5 w-3.5 opacity-60" />
                                            <span>{tag}</span>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-400">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Listing Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Zugangsdaten durchsuchen..."
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm transition-all"
                        />
                    </div>

                    {/* Results Loading / Empty State */}
                    {isLoading ? (
                        <div className="glass-card p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                            <p className="font-bold text-sm">Lade Tresor-Inhalt...</p>
                        </div>
                    ) : filteredCredentials.length === 0 ? (
                        <div className="glass-card p-16 flex flex-col items-center justify-center text-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 mb-4">
                                <KeyRound className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">Keine Zugangsdaten gefunden</h3>
                            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                                {searchQuery || selectedTag 
                                    ? "Passe deinen Suchbegriff oder deine Tag-Filter an."
                                    : "Füge deine ersten Zugangsdaten hinzu, um sie hier sicher zu verwahren."}
                            </p>
                        </div>
                    ) : (
                        /* Grid Layout for Credentials Cards */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredCredentials.map(cred => {
                                const isPasswordVisible = !!visiblePasswords[cred.id];
                                const isUsernameCopied = !!copiedStates[`${cred.id}-username`];
                                const isPasswordCopied = !!copiedStates[`${cred.id}-password`];

                                return (
                                    <div key={cred.id} className="glass-card p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight leading-snug">
                                                        {cred.title}
                                                    </h3>
                                                    {cred.url && (
                                                        <a 
                                                            href={cred.url.startsWith("http") ? cred.url : `https://${cred.url}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1 mt-0.5 hover:underline"
                                                        >
                                                            {cred.url.replace(/https?:\/\/(www\.)?/, '')}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() => handleOpenEditModal(cred)}
                                                        className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200/60 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center text-slate-400 transition-colors"
                                                        title="Bearbeiten"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(cred.id)}
                                                        className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200/60 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-slate-400 transition-colors"
                                                        title="Löschen"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details Input Display fields */}
                                            <div className="space-y-2 bg-slate-50/80 border border-slate-100 p-4 rounded-2xl text-sm font-medium text-slate-700">
                                                {/* Username */}
                                                <div className="flex items-center justify-between gap-4 py-1">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Benutzername</p>
                                                        <p className="font-bold text-slate-800 break-all select-all">{cred.username}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(cred.username, "Benutzername", cred.id)}
                                                        className="h-8 w-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                                                        title="Kopieren"
                                                    >
                                                        {isUsernameCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                                    </button>
                                                </div>

                                                <hr className="border-slate-200/50" />

                                                {/* Password */}
                                                <div className="flex items-center justify-between gap-4 py-1">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Passwort</p>
                                                        <p className="font-mono font-bold text-slate-800 break-all">
                                                            {isPasswordVisible ? cred.password : "••••••••••••••••"}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => togglePasswordVisibility(cred.id)}
                                                            className="h-8 w-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                                            title={isPasswordVisible ? "Ausblenden" : "Anzeigen"}
                                                        >
                                                            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => copyToClipboard(cred.password || "", "Passwort", cred.id)}
                                                            className="h-8 w-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                                            title="Kopieren"
                                                        >
                                                            {isPasswordCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {cred.notes && (
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Notiz</p>
                                                    <p className="text-xs text-slate-500 bg-slate-50/40 p-2.5 rounded-xl border border-slate-100/60 whitespace-pre-wrap">
                                                        {cred.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tags (Footer of card) */}
                                        {cred.tags && cred.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-slate-100">
                                                {cred.tags.map(tag => (
                                                    <span 
                                                        key={tag} 
                                                        onClick={() => setSelectedTag(tag)}
                                                        className="text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 px-2 py-0.5 rounded-md transition-all cursor-pointer capitalize"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add/Edit Credential */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                    {editingCredential ? "Zugang bearbeiten" : "Neuer Zugang"}
                                </h2>
                                <p className="text-xs text-slate-400 font-medium mt-1">
                                    {editingCredential ? "Passe die Anmeldedaten an." : "Erstelle einen neuen gesicherten Eintrag."}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                            
                            {/* Title / Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Name der Applikation / Website *</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="z.B. Microsoft 365, Obi Portal"
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all text-sm font-semibold"
                                />
                            </div>

                            {/* URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Website URL (optional)</label>
                                <input
                                    type="text"
                                    value={formUrl}
                                    onChange={(e) => setFormUrl(e.target.value)}
                                    placeholder="z.B. https://portal.obi.at"
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all text-sm font-semibold"
                                />
                            </div>

                            {/* Username */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Benutzername / E-Mail *</label>
                                <input
                                    type="text"
                                    required
                                    value={formUsername}
                                    onChange={(e) => setFormUsername(e.target.value)}
                                    placeholder="Username oder E-Mail-Adresse"
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all text-sm font-semibold"
                                />
                            </div>

                            {/* Password input & generator */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Passwort *</label>
                                    <button
                                        type="button"
                                        onClick={handleGeneratePassword}
                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1 hover:underline hover:text-indigo-700 transition-colors"
                                    >
                                        <Sparkles className="h-3 w-3" />
                                        Passwort generieren
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder="Geringe Sicherheit vermeiden!"
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all text-sm font-mono font-semibold"
                                />
                            </div>

                            {/* Tags list & Tag input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tags (Schlagwörter)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        placeholder="Tag eintippen, Enter drücken"
                                        className="flex-1 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all text-sm font-semibold"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                                    >
                                        Hinzufügen
                                    </button>
                                </div>

                                {formTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                                        {formTags.map(tag => (
                                            <span 
                                                key={tag}
                                                className="inline-flex items-center gap-1 text-xs font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg capitalize border border-indigo-100/50"
                                            >
                                                {tag}
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-rose-500 hover:scale-110 transition-all font-black text-[10px]"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Notizen (z.B. PIN, Lizenzkey)</label>
                                <textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    placeholder="Zusätzliche Informationen..."
                                    rows={3}
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all text-sm font-semibold resize-none"
                                />
                            </div>

                            {/* Form Actions (Submit/Cancel) */}
                            <div className="flex gap-4 pt-4 border-t border-slate-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Speichern
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal: Delete Confirmation */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 mx-auto text-rose-500">
                            <Trash2 className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-extrabold text-slate-800 text-lg">Eintrag löschen?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Möchtest du diese Zugangsdaten wirklich dauerhaft löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-5 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
