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
    AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";

interface MenuItem {
    icon: any;
    label: string;
    href?: string;
    children?: MenuItem[];
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Welcome", href: "/" },
    { icon: BarChart3, label: "Übersicht", href: "/dashboard" },
    {
        icon: FileText,
        label: "Rechnungen",
        children: [
            { icon: PlusCircle, label: "Neue Rechnung", href: "/invoices/new" },
            { icon: FileText, label: "Rechnungsarchiv", href: "/invoices" },
            { icon: AlertTriangle, label: "Mahnungen", href: "/invoices/dunning" },
        ]
    },
    { icon: Briefcase, label: "Projekte", href: "/projects" },
    { icon: Wrench, label: "Leistungen", href: "/services" },
    { icon: Users, label: "Kunden", href: "/customers" },
    { icon: UserSquare2, label: "Mitarbeiter", href: "/employees" },
    {
        icon: Clock,
        label: "Zeiterfassung",
        children: [
            { icon: Plus, label: "Zeiten erfassen", href: "/time-tracking" },
            { icon: FileText, label: "Zeit-Archiv", href: "/time-tracking/archive" },
        ]
    },
    { icon: BarChart3, label: "Auswertungen", href: "/reports" },
    { icon: Car, label: "Fahrzeuge", href: "/vehicles" },
    { icon: Settings, label: "Einstellungen", href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();
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
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.label);
        const isActive = item.href ? pathname === item.href : false;
        const isParentActive = hasChildren && item.children?.some(child => child.href === pathname);

        if (hasChildren) {
            return (
                <div key={item.label}>
                    <button
                        onClick={() => toggleExpand(item.label)}
                        className={cn(
                            "flex items-center justify-between w-full gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group text-base font-bold",
                            isParentActive
                                ? "bg-white/10 text-white"
                                : "hover:bg-white/5 text-sidebar-foreground/60 hover:text-white"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <Icon className={cn(
                                "h-6 w-6 transition-all duration-300",
                                isParentActive ? "text-white scale-110" : "group-hover:text-white group-hover:scale-110"
                            )} />
                            {item.label}
                        </div>
                        <ChevronDown className={cn(
                            "h-4 w-4 transition-transform duration-300",
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
        <aside className="fixed left-0 top-0 h-screen w-80 bg-sidebar text-sidebar-foreground border-r border-white/5 flex flex-col p-6 overflow-y-auto">
            <div className="flex flex-col items-center justify-center gap-4 px-3 py-8 mb-8 text-center">
                <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain bg-white/10 rounded-2xl p-1" />
                <div className="flex flex-col items-center">
                    <span className="font-black text-2xl text-white tracking-tight leading-none break-words">
                        {companySettings.companyName || "FlowY"}
                    </span>
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">
                        Professional
                    </span>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {menuItems.map(item => renderMenuItem(item))}
            </nav>

            <div className="mt-12 border-t border-white/10 pt-8 pb-4">
                <button
                    onClick={() => logout()}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl w-full text-sidebar-foreground/60 hover:text-white hover:bg-white/5 transition-all duration-300 text-base font-bold group"
                >
                    <LogOut className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    Ausloggen
                </button>
                <div className="mt-8 px-5 text-[11px] text-white/20 uppercase font-black tracking-[0.2em] text-center">
                    FlowY Version 2.0
                </div>
            </div>
        </aside>
    );
}
