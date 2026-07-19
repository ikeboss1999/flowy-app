"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvoiceForm } from "@/components/InvoiceForm";
import { useInvoices } from "@/hooks/useInvoices";

export const dynamic = 'force-dynamic';

interface EditInvoicePageProps {
    params: { id: string };
}

function EditInvoiceContent({ id }: { id: string }) {
    const router = useRouter();
    const { invoices, isLoading } = useInvoices();
    const invoice = invoices.find(inv => inv.id === id);

    useEffect(() => {
        if (!isLoading && invoice && invoice.status !== 'draft') {
            router.replace('/invoices');
        }
    }, [invoice, isLoading, router]);

    if (isLoading) {
        return <div className="dashboard-page text-slate-400 font-bold">Laden...</div>;
    }

    if (!invoice) {
        return (
            <div className="dashboard-page text-rose-500 font-bold">
                Rechnung nicht gefunden.
            </div>
        );
    }

    // Only allow editing drafts
    if (invoice.status !== 'draft') {
        return (
            <div className="dashboard-page text-slate-400 font-bold">
                Weiterleitung zur Rechnungsübersicht...
            </div>
        );
    }

    return <InvoiceForm initialData={invoice} />;
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
    return (
        <div className="dashboard-page-centered pb-24">
            <Suspense fallback={<div className="dashboard-page text-slate-400">Lade Formular...</div>}>
                <EditInvoiceContent id={params.id} />
            </Suspense>
        </div>
    );
}
