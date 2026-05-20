"use client";

import { createResourceHook } from './useResourceFactory';
import { OrderConfirmation } from '@/types/order';

const useOrdersCRUD = createResourceHook<OrderConfirmation>('/api/orders');

export function useOrders() {
    const { items, add, update, remove, isLoading } = useOrdersCRUD();
    return {
        orders: items,
        addOrder: add,
        updateOrder: update,
        deleteOrder: remove,
        isLoading,
    };
}
