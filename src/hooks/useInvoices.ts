"use client";

import { createResourceHook } from './useResourceFactory';
import { Invoice } from '@/types/invoice';

const useInvoicesCRUD = createResourceHook<Invoice>('/api/invoices');

export function useInvoices() {
    const { items, add, update, remove, isLoading } = useInvoicesCRUD();
    return {
        invoices: items,
        addInvoice: add,
        updateInvoice: update,
        deleteInvoice: remove,
        isLoading,
    };
}
