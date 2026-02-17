"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import {
    Clock,
    User,
    Calendar,
    ChevronRight,
    Briefcase,
    X,
    Info,
    CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function MobileDashboard() {
    const { currentEmployee } = useAuth()
    const [showDetails, setShowDetails] = useState(false)

    // Lock body scroll when modal is open
    useEffect(() => {
        if (showDetails) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showDetails])

    if (!currentEmployee) return null

    const permissions = currentEmployee.appAccess?.permissions

    const tiles = [
        {
            title: "Zeiterfassung",
            description: "Heute noch nicht gestempelt",
            icon: Clock,
            href: "/mobile/time-tracking",
            color: "bg-indigo-500",
            lightColor: "bg-indigo-50",
            textColor: "text-indigo-600",
            enabled: permissions?.timeTracking !== false
        },
        {
            title: "Mein Profil",
            description: "Persönliche Daten & Dokumente",
            icon: User,
            href: "/mobile/profile",
            color: "bg-amber-500",
            lightColor: "bg-amber-50",
            textColor: "text-amber-600",
            enabled: permissions?.personalData !== false
        }
    ]

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Section */}
            <div className="space-y-1">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Guten Tag,</p>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                    {currentEmployee.personalData.firstName}! 👋
                </h2>
            </div>

            {/* Quick Stats / Info Card */}
            <div className="bg-indigo-600 rounded-[2.5rem] p-7 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group active:scale-[0.98] transition-transform">
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />

                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-1 ring-white/30">
                            <Briefcase className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl ring-1 ring-emerald-400/30">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Status: Aktiv</span>
                        </div>
                    </div>

                    <div>
                        <p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Aktuelle Position</p>
                        <p className="text-2xl font-black tracking-tight">{currentEmployee.employment.position || "Mitarbeiter"}</p>
                    </div>

                    <div className="h-px bg-white/10 w-full" />

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Anstellungsverhältnis</p>
                            <p className="text-lg font-black">{currentEmployee.employment.classification || "Vollzeit"}</p>
                        </div>
                        <button
                            onClick={() => setShowDetails(true)}
                            className="bg-white text-indigo-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 active:scale-95 transition-all hover:bg-indigo-50"
                        >
                            Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Feature Tiles */}
            <div className="grid grid-cols-1 gap-4">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Funktionen</p>
                {tiles.filter(t => t.enabled).map((tile) => (
                    <Link
                        key={tile.href}
                        href={tile.href}
                        className="group flex items-center gap-4 p-5 bg-white rounded-[2rem] border border-slate-200/60 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all active:scale-[0.98]"
                    >
                        <div className={cn("p-4 rounded-2xl shrink-0 transition-transform group-hover:scale-110 shadow-sm", tile.lightColor, tile.textColor)}>
                            <tile.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-black text-slate-800 mb-0.5">{tile.title}</h3>
                            <p className="text-slate-400 text-xs font-medium truncate">{tile.description}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all">
                            <ChevronRight className="h-4 w-4 stroke-[3px]" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Secondary Actions / Information */}
            <div className="space-y-4">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Kommende Termine</p>
                <div className="bg-slate-100/40 border border-dashed border-slate-300 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center gap-4">
                    <div className="p-4 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/50 text-slate-200">
                        <Calendar className="h-8 w-8 stroke-[1.5px]" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Keine Termine</p>
                        <p className="text-slate-400/60 text-xs font-medium">Momentan sind keine Termine eingetragen.</p>
                    </div>
                </div>
            </div>

            {/* Contract Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        className="w-full max-w-lg bg-white rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden flex flex-col max-h-[90vh] relative"
                    >
                        {/* Drag Handle for mobile feel */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full" />

                        <div className="pt-10 px-8 pb-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                    <Info className="h-5 w-5 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Eckdaten</h3>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 scrollbar-hide">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Beschäftigung seit</p>
                                        </div>
                                        <p className="text-lg font-black text-slate-700 ml-1">
                                            {currentEmployee.employment.startDate ? new Date(currentEmployee.employment.startDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : "---"}
                                        </p>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalnummer</p>
                                        </div>
                                        <p className="text-lg font-black text-indigo-600 ml-1">#{currentEmployee.employeeNumber}</p>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Einstufung / Verwendung</p>
                                        </div>
                                        <p className="text-lg font-black text-slate-700 ml-1">{currentEmployee.employment.verwendung || "Standard"}</p>
                                    </div>

                                    <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center gap-4">
                                        <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
                                            <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-indigo-900 font-black">Anstellungsverhältnis: {currentEmployee.employment.status}</p>
                                            <p className="text-indigo-600/60 text-xs font-medium">Vertrag ist aktiv und gültig.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Extra spacing for bottom */}
                            <div className="h-4" />
                        </div>

                        <div className="p-8 pt-4 bg-white border-t border-slate-50 shrink-0">
                            <button
                                onClick={() => setShowDetails(false)}
                                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black tracking-widest uppercase text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
