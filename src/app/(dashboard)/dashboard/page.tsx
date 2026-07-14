"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowUpRight,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    Euro,
    FileCheck,
    FileSignature,
    FileText,
    Plus,
    ReceiptText,
    TrendingUp,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/useInvoices";
import { useOffers } from "@/hooks/useOffers";
import { useOrders } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import { Invoice } from "@/types/invoice";
import { InvoicePreviewModal } from "@/components/InvoicePreviewModal";
import { CalendarWidget } from "@/components/CalendarWidget";

const currency = (value: number) =>
    value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

const statusLabel: Record<string, string> = {
    draft: "Entwurf",
    pending: "Offen",
    paid: "Bezahlt",
    overdue: "Fällig",
    canceled: "Storniert",
    sent: "Gesendet",
    accepted: "Angenommen",
    rejected: "Abgelehnt",
    expired: "Abgelaufen",
    confirmed: "Bestätigt",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
};

const statusClass = (status: string) => {
    if (["paid", "accepted", "completed"].includes(status)) {
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
    }
    if (["overdue", "rejected", "canceled", "cancelled"].includes(status)) {
        return "bg-rose-50 text-rose-600 border-rose-100";
    }
    if (["draft", "pending"].includes(status)) {
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
    return "bg-indigo-50 text-indigo-600 border-indigo-100";
};

export default function DashboardPage() {
    const currentYear = new Date().getFullYear();
    const router = useRouter();
    const { profile } = useAuth();
    const { invoices, isLoading: invoicesLoading } = useInvoices();
    const { offers, isLoading: offersLoading } = useOffers();
    const { orders, isLoading: ordersLoading } = useOrders();
    const { customers } = useCustomers();
    const { data: companySettings } = useCompanySettings();
    const { data: accountSettings } = useAccountSettings();
    const { summary } = useDashboardSummary();
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    React.useEffect(() => {
        if (profile?.role === "developer") {
            router.push("/admin");
        }
    }, [profile, router]);

    const isAdminOrDev = profile?.role === "admin" || profile?.role === "developer";
    const canReadInvoices = isAdminOrDev || !!profile?.permissions?.invoices_read;
    const canReadOffers = isAdminOrDev || !!profile?.permissions?.offers_read;
    const canReadOrders = isAdminOrDev || !!profile?.permissions?.orders_read;
    const canWriteInvoices = isAdminOrDev || !!profile?.permissions?.invoices_write;
    const canWriteOffers = isAdminOrDev || !!profile?.permissions?.offers_write;
    const canUseCalendar = isAdminOrDev || !!profile?.permissions?.calendar_use;

    const yearInvoices = useMemo(
        () => invoices.filter((invoice) => new Date(invoice.issueDate).getFullYear() === currentYear),
        [invoices, currentYear],
    );

    const yearOffers = useMemo(
        () => offers.filter((offer) => new Date(offer.issueDate).getFullYear() === currentYear),
        [offers, currentYear],
    );

    const yearOrders = useMemo(
        () => orders.filter((order) => new Date(order.issueDate).getFullYear() === currentYear),
        [orders, currentYear],
    );

    const openInvoices = useMemo(
        () => yearInvoices.filter((invoice) => invoice.status === "pending" || invoice.status === "overdue"),
        [yearInvoices],
    );

    const draftInvoices = useMemo(
        () => yearInvoices.filter((invoice) => invoice.status === "draft"),
        [yearInvoices],
    );

    const openOffers = useMemo(
        () => yearOffers.filter((offer) => offer.status === "sent"),
        [yearOffers],
    );

    const activeOrders = useMemo(
        () => yearOrders.filter((order) => order.status === "confirmed" || order.status === "pending"),
        [yearOrders],
    );

    const recentDocuments = useMemo(() => {
        const invoiceDocs = canReadInvoices
            ? yearInvoices.map((invoice) => ({
                id: invoice.id,
                type: "Rechnung",
                number: invoice.invoiceNumber,
                customerName: invoice.customerName,
                amount: invoice.totalAmount,
                date: invoice.issueDate,
                status: invoice.status,
                icon: FileText,
                onClick: () => setSelectedInvoice(invoice),
            }))
            : [];

        const offerDocs = canReadOffers
            ? yearOffers.map((offer) => ({
                id: offer.id,
                type: offer.documentType === "estimate" ? "KVA" : "Angebot",
                number: offer.offerNumber,
                customerName: offer.customerName,
                amount: offer.totalAmount,
                date: offer.issueDate,
                status: offer.status,
                icon: FileSignature,
                href: "/offers",
            }))
            : [];

        const orderDocs = canReadOrders
            ? yearOrders.map((order) => ({
                id: order.id,
                type: "Auftrag",
                number: order.orderNumber,
                customerName: order.customerName,
                amount: order.totalAmount,
                date: order.issueDate,
                status: order.status,
                icon: FileCheck,
                href: "/orders",
            }))
            : [];

        return [...invoiceDocs, ...offerDocs, ...orderDocs]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 8);
    }, [canReadInvoices, canReadOffers, canReadOrders, yearInvoices, yearOffers, yearOrders]);

    const urgentItems = useMemo(() => {
        const overdue = openInvoices.filter((invoice) => invoice.status === "overdue").length;
        return [
            canReadInvoices && {
                label: "Fällige Rechnungen",
                value: overdue,
                text: overdue > 0 ? "Bitte Mahnwesen prüfen" : "Keine fälligen Rechnungen",
                href: "/invoices",
                tone: overdue > 0 ? "rose" : "emerald",
            },
            canReadInvoices && {
                label: "Rechnungsentwürfe",
                value: draftInvoices.length,
                text: "Noch nicht finalisiert",
                href: "/invoices",
                tone: "amber",
            },
            canReadOffers && {
                label: "Offene Angebote",
                value: openOffers.length,
                text: "Warten auf Entscheidung",
                href: "/offers",
                tone: "indigo",
            },
        ].filter(Boolean) as Array<{ label: string; value: number; text: string; href: string; tone: string }>;
    }, [canReadInvoices, canReadOffers, draftInvoices.length, openInvoices, openOffers.length]);

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 11) return "Guten Morgen";
        if (hour < 17) return "Guten Tag";
        return "Guten Abend";
    })();

    const isLoading = invoicesLoading || offersLoading || ordersLoading;

    const kpis = [
        canReadInvoices && {
            label: "Umsatz",
            value: currency(summary?.totalRevenue ?? 0),
            sub: `Bezahlt ${currentYear}`,
            icon: TrendingUp,
            className: "bg-indigo-50 text-indigo-600 border-indigo-100",
            href: "/reports",
        },
        canReadInvoices && {
            label: "Offene Rechnungen",
            value: currency(summary?.openAmount ?? 0),
            sub: `${summary?.openInvoicesCount ?? openInvoices.length} offen/fällig`,
            icon: AlertCircle,
            className: "bg-rose-50 text-rose-600 border-rose-100",
            href: "/invoices",
        },
        canReadOffers && {
            label: "Offene Angebote",
            value: currency(summary?.openOffersAmount ?? 0),
            sub: `${summary?.openOffersCount ?? openOffers.length} gesendet`,
            icon: FileSignature,
            className: "bg-emerald-50 text-emerald-600 border-emerald-100",
            href: "/offers",
        },
        canReadOrders && {
            label: "Aktive Aufträge",
            value: String(activeOrders.length),
            sub: "Bestätigt oder in Arbeit",
            icon: FileCheck,
            className: "bg-amber-50 text-amber-600 border-amber-100",
            href: "/orders",
        },
    ].filter(Boolean) as Array<{
        label: string;
        value: string;
        sub: string;
        icon: React.ElementType;
        className: string;
        href: string;
    }>;

    return (
        <div className="dashboard-page">
            <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
                <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
                            <ReceiptText className="h-5 w-5 text-cyan-100" />
                            <span className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">Übersicht</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl font-outfit">
                                {greeting}, {accountSettings?.name || "Benutzer"}
                            </h1>
                            <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-white/70">
                                Aktueller Stand für {companySettings?.companyName || "Ihr Unternehmen"} im Jahr {currentYear}.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {canWriteOffers && (
                            <Link
                                href="/offers/new"
                                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-white hover:text-indigo-700"
                            >
                                <FileSignature className="h-4 w-4" />
                                Neues Angebot
                            </Link>
                        )}
                        {canWriteInvoices && (
                            <Link
                                href="/invoices/new"
                                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-xl shadow-indigo-950/20 transition hover:scale-[1.02] active:scale-95"
                            >
                                <Plus className="h-4 w-4" />
                                Neue Rechnung
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <Link
                            key={kpi.label}
                            href={kpi.href}
                            className="group rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-xl hover:shadow-slate-200/70"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", kpi.className)}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-indigo-500" />
                            </div>
                            <div className="mt-6">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{kpi.label}</p>
                                <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{kpi.value}</p>
                                <p className="mt-1 text-sm font-bold text-slate-500">{kpi.sub}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-8">
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Aktuelle Dokumente</h2>
                                <p className="text-sm font-semibold text-slate-500">Die neuesten Rechnungen, Angebote und Aufträge.</p>
                            </div>
                            <Link href="/invoices" className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                                Archiv öffnen
                            </Link>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100">
                            {isLoading ? (
                                <div className="py-20 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                                    Daten werden geladen...
                                </div>
                            ) : recentDocuments.length === 0 ? (
                                <div className="py-20 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                                    Noch keine Dokumente vorhanden
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {recentDocuments.map((doc) => {
                                        const Icon = doc.icon;
                                        const content = (
                                            <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-indigo-600">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-black text-slate-900">{doc.type} #{doc.number}</p>
                                                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", statusClass(doc.status))}>
                                                            {statusLabel[doc.status] || doc.status}
                                                        </span>
                                                    </div>
                                                    <p className="truncate text-sm font-semibold text-slate-500">{doc.customerName}</p>
                                                </div>
                                                <div className="hidden text-right sm:block">
                                                    <p className="font-black text-slate-900">{currency(doc.amount)}</p>
                                                    <p className="text-xs font-bold text-slate-400">{new Date(doc.date).toLocaleDateString("de-DE")}</p>
                                                </div>
                                                <ArrowUpRight className="h-4 w-4 text-slate-300" />
                                            </div>
                                        );

                                        if ("onClick" in doc && doc.onClick) {
                                            return (
                                                <button key={`${doc.type}-${doc.id}`} type="button" onClick={doc.onClick} className="w-full text-left">
                                                    {content}
                                                </button>
                                            );
                                        }

                                        return (
                                            <Link key={`${doc.type}-${doc.id}`} href={"href" in doc ? doc.href : "/dashboard"}>
                                                {content}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                        {urgentItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:border-indigo-100 hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                                        <p className="mt-3 text-4xl font-black text-slate-900">{item.value}</p>
                                        <p className="mt-1 text-sm font-bold text-slate-500">{item.text}</p>
                                    </div>
                                    {item.tone === "rose" ? (
                                        <AlertCircle className="h-6 w-6 text-rose-500" />
                                    ) : item.tone === "emerald" ? (
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    ) : (
                                        <Clock className="h-6 w-6 text-amber-500" />
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <aside className="space-y-8">
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Schnellzugriff</h2>
                                <p className="text-sm font-semibold text-slate-500">Häufige Bereiche</p>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            {[
                                { label: "Kunden", href: "/customers", icon: Users },
                                { label: "Projekte", href: "/projects", icon: FileCheck },
                                { label: "Zeiten erfassen", href: "/time-tracking", icon: Clock },
                                { label: "Auswertungen", href: "/reports", icon: Euro },
                            ].map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 font-black text-slate-700 transition hover:bg-white hover:text-indigo-600"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icon className="h-4 w-4" />
                                            {link.label}
                                        </span>
                                        <ArrowUpRight className="h-4 w-4 text-slate-300" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {canUseCalendar && (
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                            <div className="mb-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <CalendarIcon className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900">Tagesplan</h2>
                                </div>
                                <Link href="/calendar" className="text-xs font-black uppercase tracking-wider text-indigo-600">
                                    Kalender
                                </Link>
                            </div>
                            <CalendarWidget isCompact />
                        </div>
                    )}
                </aside>
            </div>

            <InvoicePreviewModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoice={selectedInvoice}
                customer={customers.find((customer) => customer.id === selectedInvoice?.customerId)}
                companySettings={companySettings}
            />
        </div>
    );
}
