"use client";

import { Suspense } from "react";
import { InvoiceForm } from "@/components/InvoiceForm";

export const dynamic = 'force-dynamic';

export default function NewInvoicePage() {
    return (
        <div className="dashboard-page-centered pb-24">
            <Suspense fallback={<div className="dashboard-page text-slate-400">Lade Formular...</div>}>
                <InvoiceForm />
            </Suspense>
        </div>
    );
}
