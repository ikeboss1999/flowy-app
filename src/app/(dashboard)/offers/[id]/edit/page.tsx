"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OfferForm } from "@/components/OfferForm";
import { useOffers } from "@/hooks/useOffers";

export const dynamic = 'force-dynamic';

interface EditOfferPageProps {
    params: { id: string };
}

function EditOfferContent({ id }: { id: string }) {
    const router = useRouter();
    const { offers, isLoading } = useOffers();
    const offer = offers.find(o => o.id === id);

    useEffect(() => {
        if (!isLoading && offer && offer.status !== 'draft') {
            router.replace('/offers');
        }
    }, [offer, isLoading, router]);

    if (isLoading) {
        return <div className="dashboard-page text-slate-400 font-bold">Laden...</div>;
    }

    if (!offer) {
        return (
            <div className="dashboard-page text-rose-500 font-bold">
                Angebot nicht gefunden.
            </div>
        );
    }

    if (offer.status !== 'draft') {
        return (
            <div className="dashboard-page text-slate-400 font-bold">
                Weiterleitung zur Angebotsübersicht...
            </div>
        );
    }

    return <OfferForm initialData={offer} />;
}

export default function EditOfferPage({ params }: EditOfferPageProps) {
    return (
        <div className="dashboard-page-centered pb-24">
            <Suspense fallback={<div className="dashboard-page text-slate-400">Lade Formular...</div>}>
                <EditOfferContent id={params.id} />
            </Suspense>
        </div>
    );
}
