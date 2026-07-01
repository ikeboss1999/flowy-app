"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Laptop, Shield, User, Info, Cpu, Code2 } from "lucide-react";

export function AppInfo() {
    const { user, profile, currentEmployee } = useAuth();
    const [deviceInfo, setDeviceInfo] = useState({ os: "Lade...", browser: "Lade...", screen: "Lade..." });

    useEffect(() => {
        if (typeof window !== "undefined") {
            const ua = window.navigator.userAgent;
            let os = "Unbekannt";
            let browser = "Unbekannt";

            // OS Detection
            if (ua.indexOf("Win") !== -1) os = "Windows";
            else if (ua.indexOf("Mac") !== -1) os = "macOS";
            else if (ua.indexOf("Linux") !== -1) os = "Linux";
            else if (ua.indexOf("Android") !== -1) os = "Android";
            else if (ua.indexOf("like Mac") !== -1) os = "iOS";

            // Browser Detection
            if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Chromium") === -1 && ua.indexOf("Edg") === -1) {
                browser = "Google Chrome";
            } else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) {
                browser = "Apple Safari";
            } else if (ua.indexOf("Firefox") !== -1) {
                browser = "Mozilla Firefox";
            } else if (ua.indexOf("Edg") !== -1) {
                browser = "Microsoft Edge";
            }

            setDeviceInfo({
                os,
                browser,
                screen: `${window.screen.width} x ${window.screen.height} (${window.innerWidth} x ${window.innerHeight} Viewport)`
            });
        }
    }, []);

    // Format Role name
    const getRoleLabel = (role: string | undefined) => {
        if (!role) return "Keine Rolle";
        if (role === "admin") return "Administrator";
        if (role === "developer") return "Entwickler (System)";
        if (role === "employee") return "Mitarbeiter";
        return role;
    };

    // Determine displayed username
    const displayName = currentEmployee 
        ? `${currentEmployee.personalData.firstName} ${currentEmployee.personalData.lastName}`
        : (user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Unbekannter Benutzer");

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Grid for Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* App Info Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-8 rounded-[32px] border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Info className="h-40 w-40" />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                <Cpu className="h-6 w-6 text-indigo-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Anwendungsdetails</h3>
                                <p className="text-sm text-indigo-200/60 font-medium">Aktuelle Systemdaten</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-indigo-200/70 font-semibold text-sm">App Name</span>
                                <span className="font-bold text-sm">FlowY</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-indigo-200/70 font-semibold text-sm">Version</span>
                                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-xs">1.4.0</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-indigo-200/70 font-semibold text-sm">Lizenz</span>
                                <span className="font-bold text-sm text-emerald-400">Enterprise</span>
                            </div>
                            <div className="flex justify-between pb-2">
                                <span className="text-indigo-200/70 font-semibold text-sm">Entwickler</span>
                                <span className="font-bold text-sm flex items-center gap-1.5">
                                    <Code2 className="h-4 w-4 text-indigo-300" />
                                    Ilhan Etovic
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Session & Device Card */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Laptop className="h-40 w-40 text-slate-900" />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 rounded-2xl">
                                <User className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-slate-900">Sitzung & Gerät</h3>
                                <p className="text-sm text-slate-400 font-medium">Diagnose-Informationen</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-400 font-semibold text-sm">Aktueller Benutzer</span>
                                <span className="font-bold text-slate-800 text-sm">{displayName}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-400 font-semibold text-sm">Aktive Rolle</span>
                                <span className="font-bold text-indigo-600 text-sm flex items-center gap-1.5">
                                    <Shield className="h-4 w-4" />
                                    {getRoleLabel(profile?.role)}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-400 font-semibold text-sm">Betriebssystem</span>
                                <span className="font-bold text-slate-800 text-sm">{deviceInfo.os}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-400 font-semibold text-sm">Browser</span>
                                <span className="font-bold text-slate-800 text-sm">{deviceInfo.browser}</span>
                            </div>
                            <div className="flex justify-between pb-2">
                                <span className="text-slate-400 font-semibold text-sm">Bildschirmauflösung</span>
                                <span className="font-bold text-slate-800 text-sm">{deviceInfo.screen}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
