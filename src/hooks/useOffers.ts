"use client";

import { createResourceHook } from './useResourceFactory';
import { Offer } from '@/types/offer';

const useOffersCRUD = createResourceHook<Offer>('/api/offers');

export function useOffers() {
    const { items, add, update, remove, isLoading } = useOffersCRUD();
    return {
        offers: items,
        addOffer: add,
        updateOffer: update,
        deleteOffer: remove,
        isLoading,
    };
}
