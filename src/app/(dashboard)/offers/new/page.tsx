"use client";

import { Suspense } from "react";
import { OfferForm } from "@/components/OfferForm";

export const dynamic = 'force-dynamic';

export default function NewOfferPage() {
    return (
        <div className="dashboard-page-centered pb-24">
            <Suspense fallback={<div className="dashboard-page text-slate-400">Lade Formular...</div>}>
                <OfferForm />
            </Suspense>
        </div>
    );
}
