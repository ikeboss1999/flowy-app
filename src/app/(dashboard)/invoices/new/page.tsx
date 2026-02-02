"use client";

import { Suspense } from "react";
import { InvoiceForm } from "@/components/InvoiceForm";

export const dynamic = 'force-dynamic';

export default function NewInvoicePage() {
    return (
        <div className="p-10 pb-24">
            <Suspense fallback={<div className="p-10 text-slate-400">Lade Formular...</div>}>
                <InvoiceForm />
            </Suspense>
        </div>
    );
}
