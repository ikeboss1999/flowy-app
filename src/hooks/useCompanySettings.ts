"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CompanyData } from '@/types/company';

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
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<CompanyData>(initialData);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                const response = await fetch(`/api/settings?userId=${user.id}`);
                const allSettings = await response.json();

                if (allSettings.companyData) {
                    setData(allSettings.companyData);
                } else {
                    // Migration
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
            } catch (e) {
                console.error('Failed to load company settings', e);
            }
            setIsLoading(false);
        };

        loadData();
    }, [user, authLoading]);

    const updateData = async (newData: Partial<CompanyData>) => {
        if (!user) return;
        const updated = { ...data, ...newData };

        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type: 'company', data: updated })
            });
            setData(updated);
        } catch (e) {
            console.error('Failed to update company settings', e);
        }
    };

    return { data, updateData, isLoading: isLoading || authLoading };
}
