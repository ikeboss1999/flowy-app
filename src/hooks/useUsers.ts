"use client";

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export interface UserRole {
    id: string;
    user_id: string;
    company_owner_id: string;
    role: 'admin' | 'employee' | 'developer';
    permissions: Record<string, boolean>;
    status: 'active' | 'pending';
    invited_by?: string;
    name?: string;
    email?: string;
}

export function useUsers() {
    const { data = [], isLoading, error, mutate } = useSWR<UserRole[]>('/api/settings/users', fetcher);

    return {
        users: data,
        isLoading,
        isError: error,
        mutate
    };
}
