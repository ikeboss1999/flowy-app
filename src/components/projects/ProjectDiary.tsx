"use client";

import React, { useState, useRef } from "react";
import { Plus, Trash2, Camera, FileText, X, Image as ImageIcon } from "lucide-react";
import { Project, DiaryEntry } from "@/types/project";
import { nanoid } from "nanoid";

interface ProjectDiaryProps {
    project: Project;
    onUpdate: (entries: DiaryEntry[]) => void;
    onGeneratePDF: () => void;
}

export function ProjectDiary({ project, onUpdate, onGeneratePDF }: ProjectDiaryProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newDescription, setNewDescription] = useState("");
    const [newImages, setNewImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveEntry = () => {
        if (!newDescription.trim() && newImages.length === 0) return;

        const newEntry: DiaryEntry = {
            id: nanoid(),
            date: new Date().toISOString(),
            description: newDescription,
            images: newImages
        };

        const updatedEntries = [newEntry, ...(project.diaryEntries || [])];
        onUpdate(updatedEntries);

        // Reset
        setNewDescription("");
        setNewImages([]);
        setIsAdding(false);
    };

    const deleteEntry = (id: string) => {
        const updatedEntries = (project.diaryEntries || []).filter(e => e.id !== id);
        onUpdate(updatedEntries);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-indigo-600" />
                    Bautagebuch
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={onGeneratePDF}
                        disabled={!project.diaryEntries || project.diaryEntries.length === 0}
                        className="text-slate-600 font-bold hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors text-sm border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Bericht erstellen (PDF)
                    </button>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-primary-gradient text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
                        >
                            <Plus className="h-4 w-4" /> Neuer Eintrag
                        </button>
                    )}
                </div>
            </div>

            {isAdding && (
                <div className="bg-white rounded-[24px] border-2 border-indigo-100 p-6 shadow-xl shadow-indigo-500/5 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-slate-900">Neuer Tagebucheintrag</h4>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <textarea
                            placeholder="Beschreiben Sie den aktuellen Fortschritt oder besondere Vorkommnisse..."
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium min-h-[120px]"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                        />

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Bilder</label>
                            <div className="flex flex-wrap gap-3">
                                {newImages.map((img, idx) => (
                                    <div key={idx} className="relative h-24 w-24 rounded-xl overflow-hidden group">
                                        <img src={img} alt="Preview" className="h-full w-full object-cover" />
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all bg-slate-50/50"
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
                                className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSaveEntry}
                                className="px-8 py-2.5 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
                            >
                                Eintrag speichern
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {!project.diaryEntries || project.diaryEntries.length === 0 ? (
                    <div className="bg-slate-50 rounded-[24px] border border-slate-100 p-12 text-center border-dashed">
                        <ImageIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Noch keine Einträge im Bautagebuch vorhanden.</p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="mt-4 text-indigo-600 font-bold hover:underline"
                        >
                            Ersten Eintrag erstellen
                        </button>
                    </div>
                ) : (
                    project.diaryEntries.map((entry) => (
                        <div key={entry.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-50 p-2 rounded-lg">
                                            <FileText className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">
                                                {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                {new Date(entry.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteEntry(entry.id)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {entry.description && (
                                    <p className="text-slate-600 mb-6 leading-relaxed whitespace-pre-wrap">{entry.description}</p>
                                )}

                                {entry.images && entry.images.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {entry.images.map((img, idx) => (
                                            <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer">
                                                <img src={img} alt={`Bild ${idx + 1}`} className="h-full w-full object-cover" />
                                            </div>
                                        ))}
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
