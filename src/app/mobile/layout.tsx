"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Clock, User, LogOut, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

export default function MobileLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { logoutEmployee, currentEmployee } = useAuth()

    const permissions = currentEmployee?.appAccess?.permissions;
    const navItems = [
        { href: "/mobile/dashboard", icon: LayoutDashboard, label: "Dashboard", enabled: true },
        { href: "/mobile/time-tracking", icon: Clock, label: "Zeiterfassung", enabled: permissions?.timeTracking !== false },
        { href: "/mobile/profile", icon: User, label: "Profil", enabled: true },
    ].filter(item => item.enabled);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
            {/* Mobile Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between shadow-sm shadow-slate-200/20">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 ring-2 ring-indigo-50">
                        <Layers className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500 leading-none mb-1">FlowY Mobile</p>
                        <h1 className="text-sm font-black text-slate-800 tracking-tight">
                            {currentEmployee ? `${currentEmployee.personalData.firstName} ${currentEmployee.personalData.lastName}` : "Mitarbeiter"}
                        </h1>
                    </div>
                </div>
                <button
                    onClick={logoutEmployee}
                    className="h-10 w-10 rounded-xl bg-slate-100/50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-x-hidden">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 px-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 bg-white/90 backdrop-blur-2xl border-t border-slate-200/60 flex items-center justify-center gap-12 shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1.5 transition-all duration-300",
                                isActive ? "text-indigo-600 scale-110" : "text-slate-400"
                            )}
                        >
                            <div className={cn(
                                "p-2.5 rounded-2xl transition-all duration-300",
                                isActive ? "bg-indigo-50 shadow-inner" : "bg-transparent"
                            )}>
                                <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
