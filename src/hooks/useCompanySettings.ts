"use client";

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { CompanyData } from '@/types/company';
import { fetcher } from '@/lib/fetcher';

const initialData: CompanyData = {
    companyName: '',
    email: '',
    street: '',
    zipCode: '',
    city: '',
    country: '',
    ceoFirstName: '',
    ceoLastName: '',
    phone: '',
    website: '',
    vatId: '',
    commercialRegisterNumber: '',
    commercialCourt: '',
    employerNumber: '',
    bankName: '',
    bic: '',
    iban: '',
    nextEmployeeNumber: '100001',
    employeeNumberPrefix: 'MA-'
};

export function useCompanySettings() {
    const { user, currentEmployee } = useAuth();

    const activeUserId = user?.id || currentEmployee?.userId;
    const key = activeUserId ? `/api/settings?userId=${activeUserId}` : null;

    const { data: allSettings, isLoading, error, mutate } = useSWR(key, fetcher);

    const data: CompanyData = allSettings?.companyData ?? initialData;

    const updateData = async (newData: Partial<CompanyData>) => {
        const targetUserId = user?.id || currentEmployee?.userId;
        if (!targetUserId) return;
        const updated = { ...data, ...newData };
        mutate({ ...allSettings, companyData: updated }, false);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUserId, type: 'company', data: updated })
            });
        } catch (e) {
            console.error('Failed to update company settings', e);
            mutate();
        }
    };

    return { data, updateData, isLoading, error: error?.message ?? null };
}
