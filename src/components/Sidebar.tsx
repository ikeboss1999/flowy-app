"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    BarChart3,
    Users,
    UserSquare2,
    FileText,
    Settings,
    LayoutDashboard,
    LogOut,
    PlusCircle,
    Plus,
    Briefcase,
    Wrench,
    Clock,
    Car,
    ChevronDown,
    AlertTriangle,
    Shield,
    Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/context/SyncContext";
import { Cloud, CheckCircle2, RefreshCcw, Menu, X } from "lucide-react";
import { useDevice } from "@/hooks/useDevice";
import { useEffect } from "react";

interface MenuItem {
    icon: any;
    label: string;
    href?: string;
    children?: MenuItem[];
    adminOnly?: boolean;
}

interface MenuGroup {
    title: string;
    items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
    {
        title: "Übersicht",
        items: [
            { icon: LayoutDashboard, label: "Welcome", href: "/" },
            { icon: BarChart3, label: "Übersicht", href: "/dashboard" },
        ]
    },
    {
        title: "Kerngeschäft",
        items: [
            { icon: Wrench, label: "Leistungen", href: "/services" },
            { icon: Users, label: "Kunden", href: "/customers" },
            { icon: UserSquare2, label: "Mitarbeiter", href: "/employees" },
            { icon: Car, label: "Fahrzeuge", href: "/vehicles" },
        ]
    },
    {
        title: "Ausführung",
        items: [
            { icon: Briefcase, label: "Projekte", href: "/projects" },
            {
                icon: Clock,
                label: "Zeiterfassung",
                children: [
                    { icon: Plus, label: "Zeiten erfassen", href: "/time-tracking" },
                    { icon: FileText, label: "Zeit-Archiv", href: "/time-tracking/archive" },
                ]
            },
        ]
    },
    {
        title: "Buchhaltung",
        items: [
            {
                icon: FileText,
                label: "Rechnungen",
                children: [
                    { icon: PlusCircle, label: "Neue Rechnung", href: "/invoices/new" },
                    { icon: FileText, label: "Rechnungsarchiv", href: "/invoices" },
                    { icon: AlertTriangle, label: "Mahnungen", href: "/invoices/dunning" },
                ]
            },
            { icon: BarChart3, label: "Auswertungen", href: "/reports" },
        ]
    },
    {
        title: "System",
        items: [
            { icon: Shield, label: "Admin Bereich", href: "/admin", adminOnly: true },
            { icon: Megaphone, label: "Werbung", href: "/admin/partners", adminOnly: true },
            { icon: Settings, label: "Einstellungen", href: "/settings" },
        ]
    }
];

export function Sidebar() {
    const path = usePathname();
    const { signOut, currentEmployee, logoutEmployee } = useAuth();
    const { status, triggerSync } = useSync();
    const { isIPad, isTouchDevice } = useDevice();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on path change (for mobile/iPad drawer)
    useEffect(() => {
        setIsOpen(false);
    }, [path]);

    const isDrawerMode = isIPad || isTouchDevice;

    const handleLogout = async () => {
        try {
            if (status === 'pending' || status === 'error') {
                await triggerSync({ blocking: true });
            }
            // DATA PERSISTENCE: We no longer wipe local data on logout.
            // This allows for offline access and faster loading upon re-login.
        } catch (e) {
            console.error("Logout sync failed:", e);
        }

        if (currentEmployee) {
            await logoutEmployee();
        } else {
            await signOut();
        }
    };
    const { data: companySettings } = useCompanySettings();
    const [expandedItems, setExpandedItems] = useState<string[]>(["Rechnungen"]);

    const toggleExpand = (label: string) => {
        setExpandedItems(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const renderMenuItem = (item: MenuItem, depth = 0) => {
        const { user } = useAuth();

        const role = (user as any)?.user_metadata?.role || (user as any)?.role;
        if (item.adminOnly && role !== 'admin') {
            return null;
        }

        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.label);
        const isActive = item.href ? path === item.href : false;
        const isParentActive = hasChildren && item.children?.some(child => child.href === path);

        if (hasChildren) {
            return (
                <div key={item.label}>
                    <button
                        onClick={() => toggleExpand(item.label)}
                        className={cn(
                            "flex items-center justify-between w-full gap-4 px-5 py-3 rounded-2xl transition-all duration-300 group text-sm font-bold",
                            isParentActive
                                ? "bg-white/10 text-white"
                                : "hover:bg-white/5 text-sidebar-foreground/60 hover:text-white"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <Icon className={cn(
                                "h-5 w-5 transition-all duration-300",
                                isParentActive ? "text-white scale-110" : "group-hover:text-white group-hover:scale-110"
                            )} />
                            {item.label}
                        </div>
                        <ChevronDown className={cn(
                            "h-3 w-3 transition-transform duration-300",
                            isExpanded ? "rotate-180" : ""
                        )} />
                    </button>
                    {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                            {item.children?.map(child => renderMenuItem(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.label}
                href={item.href!}
                className={cn(
                    "flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-300 group text-sm font-bold",
                    depth > 0 && "ml-2",
                    isActive
                        ? "bg-primary-gradient text-white shadow-xl shadow-purple-900/40 translate-x-1"
                        : "hover:bg-white/5 text-sidebar-foreground/60 hover:text-white hover:translate-x-1"
                )}
            >
                <Icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? "text-white scale-110" : "group-hover:text-white group-hover:scale-110"
                )} />
                {item.label}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile/iPad Toggle Button */}
            {isDrawerMode && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="fixed top-4 left-4 z-[100] p-3 bg-sidebar text-white rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            )}

            {/* Overlay */}
            {isDrawerMode && isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={cn(
                "fixed left-0 top-0 h-screen w-[var(--sidebar-width)] bg-sidebar text-sidebar-foreground border-r border-white/5 flex flex-col p-4 xl:p-6 overflow-y-auto custom-scrollbar transition-transform duration-300 z-[90]",
                isDrawerMode ? (isOpen ? "translate-x-0 overflow-y-auto" : "-translate-x-full") : "translate-x-0"
            )}>
                <div className="flex flex-col items-center justify-center gap-3 xl:gap-4 px-3 py-6 xl:py-8 mb-6 xl:mb-8 text-center">
                    <img src="/logo.png" alt="Logo" className="h-12 w-12 xl:h-16 xl:w-16 object-contain bg-white/10 rounded-2xl p-1" />
                    <div className="flex flex-col items-center">
                        <span className="font-black text-xl xl:text-2xl text-white tracking-tight leading-none break-words">
                            {companySettings?.companyName || "FlowY"}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">
                            Professional
                        </span>

                        {/* Sync Status Indicator */}
                        <div className={cn(
                            "mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500",
                            status === 'idle' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                            status === 'syncing' && "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
                            status === 'pending' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                            status === 'error' && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                            {status === 'idle' && <CheckCircle2 className="h-3 w-3" />}
                            {status === 'syncing' && <RefreshCcw className="h-3 w-3 animate-spin" />}
                            {(status === 'pending' || status === 'error') && <Cloud className="h-3 w-3" />}
                            <span>
                                {status === 'idle' && "Cloud Synchron"}
                                {status === 'syncing' && "Wird gesichert..."}
                                {status === 'pending' && "Wartet auf Sync"}
                                {status === 'error' && "Sync Fehler"}
                            </span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-8">
                    {menuGroups.map((group) => (
                        <div key={group.title} className="space-y-2">
                            <div className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                                {group.title}
                            </div>
                            <div className="space-y-1">
                                {group.items.map(item => renderMenuItem(item))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="mt-12 border-t border-white/10 pt-8 pb-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 px-5 py-4 rounded-2xl w-full text-sidebar-foreground/60 hover:text-white hover:bg-white/5 transition-all duration-300 text-base font-bold group"
                    >
                        <LogOut className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        Ausloggen
                    </button>
                    <div className="mt-8 px-5 text-[11px] text-white/20 uppercase font-black tracking-[0.2em] text-center">
                        FlowY Version {process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
                    </div>
                </div>
            </aside>
        </>
    );
}
