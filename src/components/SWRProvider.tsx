"use client";

import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';

export function SWRProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig value={{
            fetcher,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            refreshWhenHidden: false,
            refreshWhenOffline: false,
            shouldRetryOnError: true,
            errorRetryCount: 1,
            errorRetryInterval: 5000,
            dedupingInterval: 10 * 60 * 1000,
            focusThrottleInterval: 300000,
            loadingTimeout: 8000,
            keepPreviousData: true,
        }}>
            {children}
        </SWRConfig>
    );
}
