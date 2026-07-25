"use client";

import { SWRConfiguration } from 'swr';
import { fetcher } from './fetcher';

export const globalSwrConfig: SWRConfiguration = {
    fetcher,
    revalidateOnFocus: false, // Prevents sudden UI flashes when tab switching
    revalidateIfStale: true, // Displays cached data immediately while revalidating in background
    keepPreviousData: true, // Retains prior state while loading new filters/params
    dedupingInterval: 15000, // Deduplicates identical API requests within 15 seconds
    focusThrottleInterval: 30000, // Throttles revalidations if revalidateOnFocus is triggered
};
