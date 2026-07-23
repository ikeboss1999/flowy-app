"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    BarChart3,
    Users,
    UserSquare2,
    FileText,
    Settings,
    LayoutDashboard,
    LogOut,
    Plus,
    Briefcase,
    Wrench,
    Clock,
    Car,
    ChevronDown,
    AlertTriangle,
    Shield,
    Megaphone,
    FileSignature,
    BookOpen,
    CalendarDays,
    FolderOpen,
    Inbox,
    FileCheck,
    KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/app-version";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";
import { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { CheckCircle2, RefreshCcw, Menu, X } from "lucide-react";
import { useDevice } from "@/hooks/useDevice";

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
            { icon: LayoutDashboard, label: "Startseite", href: "/" },
            { icon: BarChart3, label: "Übersicht", href: "/dashboard" },
            { icon: CalendarDays, label: "Kalender", href: "/calendar" },
        ]
    },
    {
        title: "Vertrieb & CRM",
        items: [
            { icon: Inbox, label: "Anfragen (CRM)", href: "/crm" },
            { icon: Users, label: "Kunden", href: "/customers" },
        ]
    },
    {
        title: "Ausführung & Stammdaten",
        items: [
            { icon: Briefcase, label: "Projekte", href: "/projects" },
            {
                icon: BookOpen,
                label: "Katalog",
                children: [
                    { icon: Wrench, label: "Leistungen", href: "/services" },
                    { icon: FileText, label: "Positions-Vorlagen", href: "/position-presets" },
                ]
            },
            { icon: Car, label: "Fahrzeuge", href: "/vehicles" },
        ]
    },
    {
        title: "Personal",
        items: [
            {
                icon: UserSquare2,
                label: "Personal & Zeiten",
                children: [
                    { icon: Users, label: "Mitarbeiter", href: "/employees" },
                    { icon: Clock, label: "Zeiten erfassen", href: "/time-tracking" },
                    { icon: FileText, label: "Zeit-Archiv", href: "/time-tracking/archive" },
                ]
            }
        ]
    },
    {
        title: "Finanzen",
        items: [
            {
                icon: FileSignature,
                label: "Finanzen",
                children: [
                    { icon: FileSignature, label: "Angebote", href: "/offers" },
                    { icon: FileCheck, label: "Aufträge", href: "/orders" },
                    { icon: FileText, label: "Rechnungen", href: "/invoices" },
                    { icon: AlertTriangle, label: "Mahnwesen", href: "/invoices/dunning" },
                    { icon: BarChart3, label: "Auswertungen", href: "/reports" },
                ]
            }
        ]
    },
    {
        title: "Büro & Archiv",
        items: [
            { icon: FolderOpen, label: "Dokumenten-Archiv", href: "/archive" },
            { icon: KeyRound, label: "Zugangsdaten", href: "/credentials" },
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
    const { signOut, currentEmployee, logoutEmployee, profile } = useAuth();
    const { cache, mutate: mutateAll } = useSWRConfig();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { isDrawerLayout } = useDevice();
    const [isOpen, setIsOpen] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await mutateAll(() => true);
        setIsRefreshing(false);
    };

    // Close sidebar on path change (for mobile/iPad drawer)
    useEffect(() => {
        setIsOpen(false);
    }, [path]);

    const isDrawerMode = isDrawerLayout;

    useEffect(() => {
        if (isDrawerMode) {
            document.documentElement.style.removeProperty("--flowy-sidebar-offset");
            return;
        }

        document.documentElement.style.setProperty("--flowy-sidebar-offset", "5.5rem");

        return () => {
            document.documentElement.style.removeProperty("--flowy-sidebar-offset");
        };
    }, [isDrawerMode]);

    const handleLogout = async () => {
        try {
            // DATA PERSISTENCE: We no longer wipe local data on logout.
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
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const toggleExpand = (label: string) => {
        setExpandedItems(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const getActiveUserId = () => profile?.companyOwnerId || currentEmployee?.userId;

    const cacheHasData = (key: string) => {
        const cached = cache.get(key) as { data?: unknown } | undefined;
        return cached?.data !== undefined;
    };

    const prefetchKeys = (keys: string[]) => {
        keys.forEach(key => {
            if (cacheHasData(key)) return;
            mutateAll(key, fetcher(key), { populateCache: true, revalidate: false }).catch((error) => {
                console.warn("[SidebarPrefetch]", key, error);
            });
        });
    };

    const prefetchForHref = (href?: string) => {
        const activeUserId = getActiveUserId();
        if (!href || !activeUserId) return;

        const sharedSettings = [`/api/settings?userId=${activeUserId}`];
        const byHref: Record<string, string[]> = {
            "/dashboard": ["/api/dashboard/summary"],
            "/customers": [`/api/customers?userId=${activeUserId}`],
            "/employees": [`/api/employees?userId=${activeUserId}`],
            "/projects": [
                `/api/projects?userId=${activeUserId}`,
                `/api/customers?userId=${activeUserId}`,
                `/api/invoices?userId=${activeUserId}`,
                `/api/offers?userId=${activeUserId}`,
                `/api/orders?userId=${activeUserId}`,
                ...sharedSettings,
            ],
            "/services": [`/api/services?userId=${activeUserId}`],
            "/vehicles": [`/api/vehicles?userId=${activeUserId}`],
            "/time-tracking": [
                `/api/employees?userId=${activeUserId}`,
                `/api/time-entries?userId=${activeUserId}`,
                `/api/timesheets?userId=${activeUserId}`,
            ],
            "/time-tracking/archive": [
                `/api/employees?userId=${activeUserId}`,
                `/api/time-entries?userId=${activeUserId}`,
                `/api/timesheets?userId=${activeUserId}`,
                ...sharedSettings,
            ],
            "/offers": [`/api/offers?userId=${activeUserId}`, `/api/customers?userId=${activeUserId}`, ...sharedSettings],
            "/orders": [`/api/orders?userId=${activeUserId}`, `/api/customers?userId=${activeUserId}`, ...sharedSettings],
            "/invoices": [`/api/invoices?userId=${activeUserId}`, `/api/customers?userId=${activeUserId}`, ...sharedSettings],
            "/archive": ["/api/archive-files", "/api/archive-folders"],
            "/crm": ["/api/crm"],
            "/calendar": [`/api/calendar-events?userId=${activeUserId}`],
        };

        prefetchKeys(byHref[href] || []);
    };

    // Auto-expand parents of active children on path change
    useEffect(() => {
        const parentsToExpand: string[] = [];
        menuGroups.forEach(group => {
            group.items.forEach(item => {
                if (item.children?.some(child => child.href === path)) {
                    parentsToExpand.push(item.label);
                }
            });
        });
        if (parentsToExpand.length > 0) {
            setExpandedItems(prev => {
                const newExpanded = [...prev];
                parentsToExpand.forEach(label => {
                    if (!newExpanded.includes(label)) {
                        newExpanded.push(label);
                    }
                });
                return newExpanded;
            });
        }
    }, [path]);

    // Dynamic visibility check based on profile and permissions
    const isMenuItemVisible = (item: MenuItem): boolean => {
        if (!profile) {
            if (currentEmployee) {
                // PIN Employee fallback
                const perms = currentEmployee.appAccess?.permissions;
                if (item.adminOnly) return false;
                if (item.href === '/credentials' || item.href === '/settings') return false;
                
                if (item.href === '/time-tracking') return true;
                if (item.href === '/archive') return !!perms?.documents;
                if (item.href === '/projects') return !!perms?.projectDiary;
                
                if (item.href === '/' || item.label === "Startseite") return true;
                
                if (item.children && item.children.length > 0) {
                    return item.children.some(child => isMenuItemVisible(child));
                }
                return false;
            }
            return false;
        }

        const role = profile.role;

        // 1. Developer Role
        if (role === 'developer') {
            return !!item.adminOnly;
        }

        // 2. Admin/Employee Role - Hide developer links
        if (item.adminOnly) {
            return false;
        }

        // 3. Admin has access to all remaining links
        if (role === 'admin') {
            return true;
        }

        // 4. Employee Permissions
        if (role === 'employee') {
            const perms = profile.permissions || {};

            // Hard exclusions
            if (item.href === '/credentials' || item.href === '/settings') {
                return false;
            }

            // Check specific routes
            if (item.href === '/calendar' && !perms.calendar_use) return false;
            if (item.href === '/crm' && !perms.crm_read) return false;
            if (item.href === '/customers' && !perms.customers_read) return false;
            if (item.href === '/projects' && !perms.projects_read) return false;
            if (item.href === '/vehicles' && !perms.vehicles_use) return false;
            if (item.href === '/archive' && !perms.archive_read) return false;

            // Katalog check
            if (item.label === 'Katalog') {
                return !!(perms.invoices_write || perms.offers_write);
            }

            // Personal & Zeiten children check
            if (item.href === '/time-tracking' && !perms.time_tracking_use) return false;
            if (item.href === '/time-tracking/archive' && !perms.time_tracking_use) return false;
            if (item.href === '/employees' && !perms.employees_read) return false;

            // Finanzen children checks
            if (item.href === '/offers' && !perms.offers_read) return false;
            if (item.href === '/orders' && !perms.orders_read) return false;
            if (item.href === '/invoices' && !perms.invoices_read) return false;
            if (item.href === '/invoices/dunning' && !perms.dunning_read) return false;
            if (item.href === '/reports' && !perms.reports_read) return false;

            // Parent check
            if (item.children && item.children.length > 0) {
                return item.children.some(child => isMenuItemVisible(child));
            }
        }

        return true;
    };

    const filterMenuItem = (item: MenuItem): MenuItem | null => {
        if (!isMenuItemVisible(item)) return null;

        if (item.children) {
            const visibleChildren = item.children
                .map(child => filterMenuItem(child))
                .filter((child): child is MenuItem => child !== null);
            
            if (visibleChildren.length === 0) return null;
            return {
                ...item,
                children: visibleChildren
            };
        }

        return item;
    };

    const renderMenuItem = (item: MenuItem, depth = 0) => {
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
                        title={item.label}
                        className={cn(
                            "flex items-center rounded-2xl py-2.5 transition-all duration-300 group/item text-sm font-bold",
                            "w-full justify-between gap-4 px-4",
                            isParentActive
                                ? "bg-white/10 text-white"
                                : "hover:bg-white/5 text-sidebar-foreground/60 hover:text-white"
                        )}
                    >
                        <div className="flex min-w-0 items-center gap-4">
                            <Icon className={cn(
                                "h-5 w-5 shrink-0 transition-all duration-300",
                                isParentActive ? "text-white scale-110" : "group-hover/item:text-white group-hover/item:scale-110"
                            )} />
                            <span className="whitespace-nowrap transition-all duration-200">
                                {item.label}
                            </span>
                        </div>
                        <ChevronDown className={cn(
                            "h-3 w-3 shrink-0 transition-all duration-300",
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
                title={item.label}
                onClick={() => isDrawerMode && setIsOpen(false)}
                onMouseEnter={() => prefetchForHref(item.href)}
                onFocus={() => prefetchForHref(item.href)}
                className={cn(
                    "flex rounded-2xl py-2.5 transition-all duration-300 group/item text-sm font-bold",
                    "items-center gap-4 px-4",
                    depth > 0 && "ml-2",
                    isActive
                        ? "translate-x-1 bg-primary-gradient text-white shadow-xl shadow-purple-900/40"
                        : "hover:translate-x-1 hover:bg-white/5 text-sidebar-foreground/60 hover:text-white"
                )}
            >
                <Icon className={cn(
                    "h-5 w-5 shrink-0 transition-all duration-300",
                    isActive ? "text-white scale-110" : "group-hover/item:text-white group-hover/item:scale-110"
                )} />
                <span className="whitespace-nowrap transition-all duration-200">
                    {item.label}
                </span>
            </Link>
        );
    };

    const renderRailItem = (item: MenuItem) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        const isActive = item.href ? path === item.href : false;
        const isParentActive = hasChildren && item.children?.some(child => child.href === path);
        const active = isActive || isParentActive;
        const visibleChildren = item.children || [];

        const iconButtonClass = cn(
            "group relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-sidebar-foreground/70 transition-all duration-300",
            active
                ? "bg-primary-gradient text-white shadow-lg shadow-purple-950/40"
                : "hover:-translate-y-0.5 hover:scale-110 hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-indigo-950/30"
        );

        const Popover = (
            <>
            <div className="pointer-events-none absolute left-full top-1/2 z-[119] h-[4.25rem] w-5 -translate-y-1/2 group-hover:pointer-events-auto" />
            <div className="pointer-events-none absolute left-[calc(100%+0.35rem)] top-1/2 z-[120] min-w-[13rem] -translate-y-1/2 translate-x-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 text-white opacity-0 shadow-2xl shadow-slate-950/40 backdrop-blur-xl ring-1 ring-white/10 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
                <div className="px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
                        Navigation
                    </div>
                    <div className="mt-1 whitespace-nowrap text-sm font-black">{item.label}</div>
                </div>
                {visibleChildren.length > 0 && (
                    <div className="mt-1 space-y-1 border-t border-white/10 pt-2">
                        {visibleChildren.map(child => {
                            const ChildIcon = child.icon;
                            const childActive = child.href === path;

                            return (
                                <Link
                                    key={child.label}
                                    href={child.href!}
                                    onMouseEnter={() => prefetchForHref(child.href)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black transition-all hover:translate-x-0.5",
                                        childActive
                                            ? "bg-white text-slate-950"
                                            : "text-white/70 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <ChildIcon className="h-4 w-4 shrink-0" />
                                    <span className="whitespace-nowrap">{child.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
            </>
        );

        if (hasChildren) {
            return (
                <div key={item.label} className={iconButtonClass} title={item.label}>
                    <span className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0 transition-all duration-300 group-hover:bg-white/5" />
                    <Icon className="relative h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-125" />
                    {Popover}
                </div>
            );
        }

        return (
            <Link
                key={item.label}
                href={item.href!}
                title={item.label}
                onMouseEnter={() => prefetchForHref(item.href)}
                onFocus={() => prefetchForHref(item.href)}
                className={iconButtonClass}
            >
                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0 transition-all duration-300 group-hover:bg-white/5" />
                <Icon className="relative h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-125" />
                {Popover}
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
                    className="fixed inset-0 bg-white/30 z-[80] animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={cn(
                "fixed left-0 top-0 z-[90] flex h-screen flex-col border-r border-white/5 bg-sidebar text-sidebar-foreground transition-all duration-300",
                isDrawerMode
                    ? cn("w-[var(--sidebar-width)] overflow-y-auto overflow-x-hidden p-4 xl:p-6", isOpen ? "translate-x-0" : "-translate-x-full")
                    : "w-[5.5rem] overflow-visible p-3 [.sidebar-collapsed_&]:-translate-x-full"
            )}
                data-flowy-sidebar
            >
                <div className={cn(
                    "flex flex-col items-center justify-center gap-3 px-1 text-center",
                    isDrawerMode ? "mb-6 py-6 xl:gap-4 xl:py-8" : "shrink-0 py-5"
                )}>
                    <div className="group/logo relative">
                        <img src="/logo.png" alt="Logo" className="h-12 w-12 shrink-0 rounded-2xl bg-white/10 object-contain p-1 xl:h-12 xl:w-12" />
                        {!isDrawerMode && (
                            <div className="pointer-events-none absolute left-[calc(100%+0.8rem)] top-1/2 z-[120] -translate-y-1/2 translate-x-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-left text-white opacity-0 shadow-2xl shadow-slate-950/40 backdrop-blur-xl ring-1 ring-white/10 transition-all duration-200 group-hover/logo:translate-x-0 group-hover/logo:opacity-100">
                                <div className="whitespace-nowrap text-sm font-black">{companySettings?.companyName || "FlowY"}</div>
                                <div className="mt-1 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Professional</div>
                            </div>
                        )}
                    </div>
                    {isDrawerMode && (
                    <div className="flex min-w-0 flex-col items-center transition-all duration-200">
                        <span className="max-w-[14rem] break-words text-xl font-black leading-none tracking-tight text-white xl:text-2xl">
                            {companySettings?.companyName || "FlowY"}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">
                            Professional
                        </span>

                        {/* Cloud Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            title="Daten aus Cloud aktualisieren"
                            className={cn(
                                "mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-50",
                                isRefreshing
                                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            )}
                        >
                            {isRefreshing
                                ? <RefreshCcw className="h-3 w-3 animate-spin" />
                                : <CheckCircle2 className="h-3 w-3" />}
                            <span className="whitespace-nowrap">{isRefreshing ? "Wird geladen..." : "Cloud Synchron"}</span>
                        </button>
                    </div>
                    )}
                </div>

                <nav className={cn(
                    isDrawerMode
                        ? "flex-1 space-y-4"
                        : "flex flex-1 flex-col justify-center gap-1 py-3"
                )}>
                    {menuGroups.map((group) => {
                        const filteredItems = group.items
                            .map(item => filterMenuItem(item))
                            .filter((item): item is MenuItem => item !== null);

                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={group.title} className={cn(isDrawerMode ? "space-y-1" : "space-y-1")}>
                                {isDrawerMode && (
                                    <div className="mb-1 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 transition-all duration-200">
                                        {group.title}
                                    </div>
                                )}
                                <div className="space-y-0.5">
                                    {filteredItems.map(item => isDrawerMode ? renderMenuItem(item) : renderRailItem(item))}
                                </div>
                            </div>
                        );
                    })}
                </nav>


                <div className={cn(
                    "shrink-0 border-t border-white/10 pb-4",
                    isDrawerMode ? "mt-12 pt-8" : "mt-3 pt-4"
                )}>
                    <button
                        onClick={handleLogout}
                        title="Ausloggen"
                        className={cn(
                            "group/item flex rounded-2xl text-sidebar-foreground/60 transition-all duration-300 hover:bg-white/5 hover:text-white",
                            isDrawerMode ? "w-full items-center gap-4 px-4 py-4 text-base font-bold" : "relative mx-auto h-12 w-12 items-center justify-center px-0"
                        )}
                    >
                        <LogOut className="h-6 w-6 shrink-0 transition-transform group-hover/item:translate-x-1" />
                        {isDrawerMode ? (
                            <span className="whitespace-nowrap transition-all duration-200">Ausloggen</span>
                        ) : (
                            <span className="pointer-events-none absolute left-[calc(100%+0.8rem)] top-1/2 z-[120] -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-black text-white opacity-0 shadow-2xl shadow-slate-950/40 backdrop-blur-xl ring-1 ring-white/10 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100">
                                Ausloggen
                            </span>
                        )}
                    </button>
                    {isDrawerMode && (
                        <div className="mt-8 px-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/20 transition-all duration-200">
                            FlowY Version {APP_VERSION}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
