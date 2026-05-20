"use client";
import { createResourceHook } from './useResourceFactory';
import { Letter } from '@/types/letter';

const useLettersCRUD = createResourceHook<Letter>('/api/letters');

export function useLetters() {
    const { items, add, update, remove, isLoading, mutate } = useLettersCRUD();
    return {
        letters: items,
        addLetter: add,
        updateLetter: update,
        deleteLetter: remove,
        isLoading,
        mutateLetters: mutate,
    };
}
