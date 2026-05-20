"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export interface DashboardSummary {
    year: number;
    totalRevenue: number;
    openAmount: number;
    openInvoicesCount: number;
    openOffersCount: number;
    openOffersAmount: number;
}

export function useDashboardSummary() {
    const { user } = useAuth();
    const key = user ? '/api/dashboard/summary' : null;
    const { data, isLoading, error } = useSWR<DashboardSummary>(key, fetcher);

    return {
        summary: data ?? null,
        isLoading,
        error,
    };
}
