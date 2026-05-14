"use client";

import { Suspense } from "react";
import { OfferForm } from "@/components/OfferForm";

export const dynamic = 'force-dynamic';

export default function NewOfferPage() {
    return (
        <div className="p-10 pb-24">
            <Suspense fallback={<div className="p-10 text-slate-400">Lade Formular...</div>}>
                <OfferForm />
            </Suspense>
        </div>
    );
}
