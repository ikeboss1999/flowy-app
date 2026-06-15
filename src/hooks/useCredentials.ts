"use client";

import { createResourceHook } from './useResourceFactory';
import { Credential } from '@/types/credential';

const useCredentialsCRUD = createResourceHook<Credential>('/api/credentials');

export function useCredentials() {
    const { items, add, update, remove, isLoading, mutate } = useCredentialsCRUD();
    return {
        credentials: items,
        addCredential: add,
        updateCredential: update,
        deleteCredential: remove,
        isLoading,
        mutateCredentials: mutate
    };
}
