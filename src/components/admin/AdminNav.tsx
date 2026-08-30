"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArchiveRestore, BarChart3, CreditCard, Gauge, LayoutDashboard, ScrollText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
    { href: '/admin', label: 'Übersicht', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Firmen & Nutzer', icon: Users },
    { href: '/admin/sessions', label: 'Sitzungen', icon: Activity },
    { href: '/admin/billing', label: 'Preise & Zahlungen', icon: CreditCard },
    { href: '/admin/backups', label: 'Backups', icon: ArchiveRestore },
    { href: '/admin/system', label: 'Systemzustand', icon: Gauge },
    { href: '/admin/audit', label: 'Audit', icon: ScrollText },
    { href: '/admin/usage', label: 'Nutzung', icon: BarChart3 },
];

export function AdminNav() {
    const pathname = usePathname();
    return (
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {items.map(item => {
                const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
                return (
                    <Link key={item.href} href={item.href} className={cn(
                        'flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors',
                        active ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                    )}>
                        <item.icon className="h-4 w-4" /> {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
