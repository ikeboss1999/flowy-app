"use client";

import useSWR from 'swr';
import { Inquiry, InquiryNote } from '@/types/crm';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/fetcher';

export function useCRM() {
    const { user } = useAuth();

    const key = user ? `/api/crm` : null;
    const { data = [], isLoading, mutate } = useSWR<Inquiry[]>(key, fetcher);

    const addInquiry = async (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        if (!user) return null;
        const tempId = Math.random().toString(36).substring(2);
        const newInquiry: Inquiry = {
            ...inquiry,
            id: tempId,
            userId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        mutate([newInquiry, ...data], false);
        try {
            const res = await fetch('/api/crm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newInquiry)
            });
            const result = await res.json();
            if (result.success) {
                await mutate();
                return result.id;
            }
        } catch (e) {
            console.error("Failed to add inquiry", e);
            mutate();
        }
        return null;
    };

    const updateInquiry = async (id: string, updatedFields: Partial<Inquiry>) => {
        if (!user) return;
        const existing = data.find(i => i.id === id);
        if (!existing) return;

        const updated: Inquiry = {
            ...existing,
            ...updatedFields,
            updatedAt: new Date().toISOString()
        };

        mutate(data.map(i => i.id === id ? updated : i), false);
        try {
            await fetch('/api/crm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            await mutate();
        } catch (e) {
            console.error("Failed to update inquiry", e);
            mutate();
        }
    };

    const deleteInquiry = async (id: string) => {
        mutate(data.filter(i => i.id !== id), false);
        try {
            await fetch(`/api/crm?id=${id}`, { method: 'DELETE' });
            await mutate();
        } catch (e) {
            console.error("Failed to delete inquiry", e);
            mutate();
        }
    };

    return { inquiries: data, addInquiry, updateInquiry, deleteInquiry, isLoading };
}

export function useInquiryNotes(inquiryId: string | null) {
    const key = inquiryId ? `/api/crm/notes?inquiryId=${inquiryId}` : null;
    const { data = [], isLoading, mutate } = useSWR<InquiryNote[]>(key, fetcher);

    const addNote = async (content: string, createdBy: string) => {
        if (!inquiryId) return;
        const tempId = Math.random().toString(36).substring(2);
        const newNote: InquiryNote = {
            id: tempId,
            inquiryId,
            content,
            createdAt: new Date().toISOString(),
            createdBy
        };

        mutate([newNote, ...data], false);
        try {
            await fetch('/api/crm/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newNote)
            });
            await mutate();
        } catch (e) {
            console.error("Failed to add note", e);
            mutate();
        }
    };

    const deleteNote = async (id: string) => {
        mutate(data.filter(n => n.id !== id), false);
        try {
            await fetch(`/api/crm/notes?id=${id}`, { method: 'DELETE' });
            await mutate();
        } catch (e) {
            console.error("Failed to delete note", e);
            mutate();
        }
    };

    return { notes: data, addNote, deleteNote, isLoading };
}
