"use client";

import React, { useRef, useState } from "react";
import { Camera, FileText, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import useSWR from "swr";
import { Project, DiaryEntry } from "@/types/project";
import { fetcher } from "@/lib/fetcher";

interface ProjectDiaryProps {
    project: Project;
    onUpdate: (entries: DiaryEntry[]) => void;
    onGeneratePDF: () => void;
}

interface WebDiaryAttachment {
    id: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
    url?: string | null;
    isLegacyInlineImage?: boolean;
}

interface WebDiaryEntry {
    id: string;
    projectId: string;
    employeeId: string | null;
    source: "mobile" | "web" | "web-legacy";
    description: string;
    visibility: "office" | "assigned_team";
    status: "published" | "corrected" | "deleted";
    clientOperationId?: string | null;
    createdAt: string;
    updatedAt: string;
    attachments: WebDiaryAttachment[];
}

export function ProjectDiary({ project, onGeneratePDF }: ProjectDiaryProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newDescription, setNewDescription] = useState("");
    const [newImages, setNewImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, isLoading, mutate } = useSWR<{ entries: WebDiaryEntry[] }>(
        project.id ? `/api/projects/${project.id}/diary` : null,
        fetcher
    );

    const diaryEntries = data?.entries || [];

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImages((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setNewImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveEntry = async () => {
        if (!newDescription.trim() && newImages.length === 0) return;

        if (newImages.length > 0) {
            alert("Fotos fuer das neue Bautagebuch werden im naechsten Schritt ueber den Storage-Upload angebunden. Bitte diesen Eintrag vorerst ohne Bild speichern.");
            return;
        }

        try {
            const response = await fetch(`/api/projects/${project.id}/diary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: newDescription,
                    visibility: "office",
                }),
            });

            if (!response.ok) throw new Error(await response.text());

            await mutate();
            setNewDescription("");
            setNewImages([]);
            setIsAdding(false);
        } catch (error) {
            console.error("Failed to create diary entry", error);
            alert("Der Bautagebuch-Eintrag konnte nicht gespeichert werden.");
        }
    };

    const deleteEntry = async (id: string) => {
        try {
            const response = await fetch(`/api/projects/${project.id}/diary?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error(await response.text());
            await mutate();
        } catch (error) {
            console.error("Failed to delete diary entry", error);
            alert("Der Bautagebuch-Eintrag konnte nicht geloescht werden.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Camera className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Bautagebuch</h3>
                        <p className="text-sm font-medium text-slate-500">Fortschritt, Fotos und Notizen sauber dokumentieren.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onGeneratePDF}
                        disabled={diaryEntries.length === 0}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Bericht erstellen (PDF)
                    </button>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-primary-gradient flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
                        >
                            <Plus className="h-4 w-4" /> Neuer Eintrag
                        </button>
                    )}
                </div>
            </div>

            {isAdding && (
                <div className="animate-in slide-in-from-top-4 rounded-[32px] border border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-500/5 duration-300">
                    <div className="mb-4 flex items-start justify-between">
                        <h4 className="font-bold text-slate-900">Neuer Tagebucheintrag</h4>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <textarea
                            placeholder="Beschreiben Sie den aktuellen Fortschritt oder besondere Vorkommnisse..."
                            className="min-h-[120px] w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                        />

                        <div className="space-y-2">
                            <label className="pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bilder</label>
                            <div className="flex flex-wrap gap-3">
                                {newImages.map((img, idx) => (
                                    <div key={idx} className="group relative h-24 w-24 overflow-hidden rounded-xl">
                                        <img src={img} alt="Preview" className="h-full w-full object-cover" />
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="absolute right-1 top-1 rounded-full bg-rose-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-400 transition-all hover:border-indigo-300 hover:text-indigo-500"
                                >
                                    <Plus className="h-5 w-5" />
                                    <span className="text-[10px] font-bold">Foto</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="rounded-xl px-5 py-2.5 font-bold text-slate-500 transition-colors hover:bg-slate-100"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSaveEntry}
                                className="bg-primary-gradient rounded-xl px-8 py-2.5 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                            >
                                Eintrag speichern
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    <div className="rounded-[32px] border border-slate-100 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
                        Bautagebuch wird geladen...
                    </div>
                ) : diaryEntries.length === 0 ? (
                    <div className="rounded-[32px] border border-dashed border-indigo-200 bg-indigo-50/40 p-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-indigo-500 shadow-sm">
                            <ImageIcon className="h-8 w-8" />
                        </div>
                        <p className="font-medium text-slate-500">Noch keine Eintraege im Bautagebuch vorhanden.</p>
                        <button onClick={() => setIsAdding(true)} className="mt-4 font-bold text-indigo-600 hover:underline">
                            Ersten Eintrag erstellen
                        </button>
                    </div>
                ) : (
                    diaryEntries.map((entry) => (
                        <div key={entry.id} className="group overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
                            <div className="p-6">
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-indigo-50 p-2">
                                            <FileText className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">
                                                {new Date(entry.createdAt).toLocaleDateString("de-DE", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <span>{new Date(entry.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</span>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                                                    {entry.source === "mobile" ? "Mobile App" : entry.source === "web-legacy" ? "Altbestand" : "Web"}
                                                </span>
                                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">
                                                    {entry.visibility === "assigned_team" ? "Team sichtbar" : "Nur Buero"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {entry.source !== "web-legacy" && (
                                        <button
                                            onClick={() => deleteEntry(entry.id)}
                                            className="p-2 text-slate-300 transition-colors hover:text-rose-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {entry.description && (
                                    <p className="mb-6 whitespace-pre-wrap leading-relaxed text-slate-600">{entry.description}</p>
                                )}

                                {entry.attachments && entry.attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                        {entry.attachments.map((attachment, idx) => {
                                            const isInlineImage = attachment.isLegacyInlineImage && attachment.storagePath.startsWith("data:image/");
                                            const isImage = attachment.mimeType.startsWith("image/");

                                            return (
                                                <div key={attachment.id || idx} className="aspect-square overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                                                    {isInlineImage || (isImage && attachment.url) ? (
                                                        <a
                                                            href={attachment.url || attachment.storagePath}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="block h-full w-full"
                                                        >
                                                            <img
                                                                src={attachment.url || attachment.storagePath}
                                                                alt={`Bild ${idx + 1}`}
                                                                className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                                                            />
                                                        </a>
                                                    ) : isImage ? (
                                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
                                                            <ImageIcon className="h-6 w-6" />
                                                            <span className="px-2 text-center text-[10px] font-bold">Bild nicht verfuegbar</span>
                                                        </div>
                                                    ) : (
                                                        <a
                                                            href={attachment.url || undefined}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                                            onClick={(event) => {
                                                                if (!attachment.url) event.preventDefault();
                                                            }}
                                                        >
                                                            <FileText className="h-6 w-6" />
                                                            <span className="px-2 text-center text-[10px] font-bold">
                                                                {attachment.url ? "Anhang oeffnen" : "Anhang nicht verfuegbar"}
                                                            </span>
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
