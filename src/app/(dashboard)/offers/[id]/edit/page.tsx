"use client";

import { Suspense } from "react";
import { OfferForm } from "@/components/OfferForm";
import { useOffers } from "@/hooks/useOffers";

export const dynamic = 'force-dynamic';

interface EditOfferPageProps {
    params: { id: string };
}

function EditOfferContent({ id }: { id: string }) {
    const { offers, isLoading } = useOffers();
    const offer = offers.find(o => o.id === id);

    if (isLoading) {
        return <div className="p-10 text-slate-400 font-bold">Laden...</div>;
    }

    if (!offer) {
        return (
            <div className="p-10 text-rose-500 font-bold">
                Angebot nicht gefunden.
            </div>
        );
    }

    if (offer.status !== 'draft') {
        return (
            <div className="p-10 text-amber-600 font-bold bg-amber-50 rounded-2xl border border-amber-100">
                Nur Angebotsentwürfe können bearbeitet werden.
            </div>
        );
    }

    return <OfferForm initialData={offer} />;
}

export default function EditOfferPage({ params }: EditOfferPageProps) {
    return (
        <div className="p-10 pb-24">
            <Suspense fallback={<div className="p-10 text-slate-400">Lade Formular...</div>}>
                <EditOfferContent id={params.id} />
            </Suspense>
        </div>
    );
}
