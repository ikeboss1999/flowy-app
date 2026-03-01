"use client"

import { useState, useRef, useEffect } from "react"
import { useProjects } from "@/hooks/useProjects"
import {
    Camera,
    Upload,
    X,
    Check,
    Loader2,
    ArrowLeft,
    Image as ImageIcon,
    Trash2,
    Plus
} from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Project, DiaryEntry } from "@/types/project"

export default function MobileProjectDiary() {
    const { id } = useParams()
    const { getProject, updateProject } = useProjects()
    const router = useRouter()
    const [project, setProject] = useState<Project | null>(null)
    const [description, setDescription] = useState("")
    const [images, setImages] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (id) {
            const p = getProject(id as string)
            if (p) setProject(p)
        }
    }, [id, getProject])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        Array.from(files).forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result as string])
            }
            reader.readAsDataURL(file)
        })

        // Reset input for next upload
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!project || !description) return

        setIsSaving(true)
        try {
            const newEntry: DiaryEntry = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                description,
                images
            }

            const updatedEntries = [...(project.diaryEntries || []), newEntry]
            await updateProject(project.id, { diaryEntries: updatedEntries })

            setIsSuccess(true)
            setTimeout(() => {
                router.push("/mobile/dashboard")
            }, 1500)
        } catch (error) {
            console.error("Failed to save diary entry:", error)
        } finally {
            setIsSaving(false)
        }
    }

    if (!project) return (
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
    )

    if (isSuccess) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8 scale-in-center">
                <div className="h-24 w-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-emerald-200">
                    <Check className="h-12 w-12 text-emerald-600 stroke-[3px]" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Gespeichert!</h2>
                <p className="text-slate-400 font-medium">Dein Eintrag wurde erfolgreich zum Bautagebuch hinzugefügt.</p>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all shadow-sm"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="space-y-1">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Eintrag erstellen</p>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none truncate max-w-[200px]">{project.name}</h2>
                </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Beschreibung</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Was wurde heute erledigt? Besondere Vorkommnisse?"
                    className="w-full px-6 py-5 bg-white border border-slate-200 rounded-[2rem] min-h-[160px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-bold text-slate-700 shadow-sm resize-none"
                />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos ({images.length})</label>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    >
                        Hinzufügen
                    </button>
                </div>

                {images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-100 border border-slate-200 shadow-sm group">
                                <img src={img} alt="Baudokumentation" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-3 right-3 h-8 w-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-300 active:bg-slate-50 transition-all"
                        >
                            <Plus className="h-8 w-8" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Mehr Fotos</span>
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-12 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50 flex flex-col items-center justify-center text-center gap-4 active:bg-slate-100 transition-all"
                    >
                        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm ring-1 ring-slate-100">
                            <Camera className="h-8 w-8 stroke-[1.5px]" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-slate-800 font-black text-sm">Keine Fotos ausgewählt</p>
                            <p className="text-slate-400 text-xs font-medium max-w-[150px]">Tippe hier, um Fotos aufzunehmen oder hochzuladen.</p>
                        </div>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                />
            </div>

            {/* Submit Button */}
            <div className="fixed bottom-24 left-6 right-6 z-40 animate-in slide-in-from-bottom-10 duration-500">
                <button
                    onClick={handleSubmit}
                    disabled={isSaving || !description}
                    className={cn(
                        "w-full py-5 rounded-[2rem] font-black tracking-widest uppercase text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl",
                        !description
                            ? "bg-slate-100 text-slate-400"
                            : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
                    )}
                >
                    {isSaving ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            Eintrag speichern
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
