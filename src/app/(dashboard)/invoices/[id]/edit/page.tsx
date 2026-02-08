"use client";

import { Suspense } from "react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { useInvoices } from "@/hooks/useInvoices";

export const dynamic = 'force-dynamic';

interface EditInvoicePageProps {
    params: { id: string };
}

function EditInvoiceContent({ id }: { id: string }) {
    const { invoices, isLoading } = useInvoices();
    const invoice = invoices.find(inv => inv.id === id);

    if (isLoading) {
        return <div className="p-10 text-slate-400 font-bold">Laden...</div>;
    }

    if (!invoice) {
        return (
            <div className="p-10 text-rose-500 font-bold">
                Rechnung nicht gefunden.
            </div>
        );
    }

    // Only allow editing drafts
    if (invoice.status !== 'draft') {
        return (
            <div className="p-10 text-amber-600 font-bold bg-amber-50 rounded-2xl border border-amber-100">
                Nur Rechnungsentwürfe können bearbeitet werden.
            </div>
        );
    }

    return <InvoiceForm initialData={invoice} />;
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
    return (
        <div className="p-10 pb-24">
            <Suspense fallback={<div className="p-10 text-slate-400">Lade Formular...</div>}>
                <EditInvoiceContent id={params.id} />
            </Suspense>
        </div>
    );
}
