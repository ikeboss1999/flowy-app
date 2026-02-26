"use client"

import { useState } from "react"
import { useProjects } from "@/hooks/useProjects"
import {
    ChevronRight,
    Search,
    MapPin,
    ArrowLeft,
    Briefcase
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function MobileProjects() {
    const { projects, isLoading } = useProjects()
    const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all shadow-sm"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="space-y-1">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Bautagebuch</p>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Projektauswahl</h2>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Projekt suchen..."
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-bold text-slate-700 shadow-sm"
                />
            </div>

            {/* Project List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-slate-100 rounded-[2rem] animate-pulse" />
                        ))}
                    </div>
                ) : filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/mobile/projects/${project.id}/diary`}
                            className="group flex flex-col gap-4 p-6 bg-white rounded-[2.5rem] border border-slate-200/60 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all active:scale-[0.98] shadow-sm"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                                            #{project.projectNumber}
                                        </span>
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                                            Aktiv
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 truncate leading-tight mt-1">{project.name}</h3>
                                    <p className="text-slate-400 text-xs font-medium flex items-center gap-2">
                                        <Briefcase className="h-3.5 w-3.5 opacity-60" />
                                        {project.customerName}
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all shrink-0">
                                    <ChevronRight className="h-5 w-5 stroke-[3px]" />
                                </div>
                            </div>

                            <div className="h-px bg-slate-50 w-full" />

                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin className="h-3.5 w-3.5 opacity-60" />
                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                    {project.location || "Kein Standort hinterlegt"}
                                </span>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                        <div className="p-6 bg-white rounded-3xl shadow-sm ring-1 ring-slate-100 text-slate-200">
                            <Search className="h-12 w-12 stroke-[1.5px]" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-slate-800 font-black">Keine Projekte gefunden</p>
                            <p className="text-slate-400 text-xs font-medium max-w-[200px]">Versuchen Sie es mit einem anderen Suchbegriff.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
