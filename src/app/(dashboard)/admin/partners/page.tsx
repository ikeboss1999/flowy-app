"use client";

import { useState, useEffect } from "react";
import { Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

interface Partner {
    id: string;
    name: string;
    logo_content: string;
    created_at: string;
}

export default function PartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState("");
    const { showToast, showConfirm } = useNotification();

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        try {
            const res = await fetch('/api/partners');
            if (res.ok) {
                const data = await res.json();
                setPartners(data);
            }
        } catch (error) {
            console.error("Error fetching partners:", error);
            showToast("Fehler beim Laden der Partner", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showToast("Datei ist zu groß (Max 5MB)", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            await createPartner(base64String);
        };
        reader.readAsDataURL(file);
    };

    const createPartner = async (logoContent: string) => {
        if (!newPartnerName.trim()) {
            showToast("Bitte geben Sie einen Namen ein", "error");
            return;
        }

        setIsUploading(true);
        try {
            const res = await fetch('/api/partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPartnerName,
                    logo_content: logoContent
                })
            });

            if (res.ok) {
                showToast("Partner erfolgreich erstellt", "success");
                setNewPartnerName("");
                fetchPartners();
            } else {
                showToast("Fehler beim Erstellen", "error");
            }
        } catch (error) {
            console.error("Error creating partner:", error);
            showToast("Ein unerwarteter Fehler ist aufgetreten", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        showConfirm({
            title: "Partner löschen",
            message: "Möchten Sie diesen Partner wirklich löschen?",
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/partners?id=${id}`, {
                        method: 'DELETE'
                    });

                    if (res.ok) {
                        showToast("Partner gelöscht", "success");
                        setPartners(prev => prev.filter(p => p.id !== id));
                    } else {
                        showToast("Fehler beim Löschen", "error");
                    }
                } catch (error) {
                    console.error("Error deleting partner:", error);
                    showToast("Fehler beim Löschen", "error");
                }
            }
        });
    };

    return (
        <div className="flex-1 p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">
                        Partner & Werbung
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Verwalten Sie Partnerlogos für die Welcome-Seite.
                    </p>
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-slate-900">Neuen Partner hinzufügen</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Name</label>
                        <input
                            value={newPartnerName}
                            onChange={(e) => setNewPartnerName(e.target.value)}
                            placeholder="Partnername eingeben..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                        />
                    </div>
                </div>

                <div className="relative group">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading || !newPartnerName}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className={`
                        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-all
                        ${!newPartnerName ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-slate-50 border-slate-300 group-hover:bg-indigo-50 group-hover:border-indigo-400'}
                    `}>
                        {isUploading ? (
                            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                        ) : (
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Upload className="h-8 w-8 text-indigo-500" />
                            </div>
                        )}
                        <div className="text-center">
                            <p className="text-slate-900 font-bold">
                                {isUploading ? "Wird hochgeladen..." : "Logo hochladen"}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-1">PNG, JPG bis 5MB</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 flex justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : partners.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Keine Partner vorhanden</p>
                    </div>
                ) : (
                    partners.map(partner => (
                        <div key={partner.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="aspect-video bg-slate-50 rounded-xl mb-4 flex items-center justify-center p-4 overflow-hidden">
                                <img
                                    src={partner.logo_content}
                                    alt={partner.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-slate-900">{partner.name}</h4>
                                <button
                                    onClick={() => handleDelete(partner.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
