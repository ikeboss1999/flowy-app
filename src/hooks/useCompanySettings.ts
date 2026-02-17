"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CompanyData } from '@/types/company';
import { useSync } from '@/context/SyncContext';

const STORAGE_KEY = 'flowy_company_data';

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
    iban: ''
};

export function useCompanySettings() {
    const { user, currentEmployee, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<CompanyData>(initialData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { markDirty } = useSync();

    const activeUserId = user?.id || currentEmployee?.userId;

    useEffect(() => {
        if (authLoading || !activeUserId) {
            if (!authLoading && !activeUserId) setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setError(null);
            try {
                const response = await fetch(`/api/settings?userId=${activeUserId}`);

                if (!response.ok) {
                    throw new Error(`Server Error: ${response.status}`);
                }

                const allSettings = await response.json();

                if (allSettings.companyData) {
                    setData(allSettings.companyData);
                } else if (user) {
                    // Migration (Admin only)
                    const storageKey = `${STORAGE_KEY}_${user.id}`;
                    const savedData = localStorage.getItem(storageKey);
                    if (savedData) {
                        try {
                            const parsed = JSON.parse(savedData);
                            await fetch('/api/settings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, type: 'company', data: parsed })
                            });
                            setData(parsed);
                        } catch (e) {
                            console.error('Migration failed', e);
                        }
                    }
                }
            } catch (e: any) {
                console.error('Failed to load company settings', e);
                setError(e.message || 'Unknown Error');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [activeUserId, authLoading, user]);

    const updateData = async (newData: Partial<CompanyData>) => {
        const targetUserId = user?.id || currentEmployee?.userId;
        if (!targetUserId) return;

        const updated = { ...data, ...newData };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetUserId, type: 'company', data: updated })
            });
            setData(updated);
            markDirty();
        } catch (e) {
            console.error('Failed to update company settings', e);
        }
    };

    return { data, updateData, isLoading: isLoading || authLoading, error };
}
