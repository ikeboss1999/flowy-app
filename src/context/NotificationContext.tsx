"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InputDialog } from '@/components/ui/InputDialog';

interface NotificationContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (options: {
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: () => void;
        onCancel?: () => void;
        variant?: 'danger' | 'primary';
    }) => void;
    showPrompt: (options: {
        title: string;
        message: string;
        placeholder?: string;
        initialValue?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: (value: string) => void;
        onCancel?: () => void;
    }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
    const [confirmOptions, setConfirmOptions] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        onConfirm: () => void;
        onCancel?: () => void;
        variant: 'danger' | 'primary';
    } | null>(null);
    const [promptOptions, setPromptOptions] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        placeholder?: string;
        initialValue?: string;
        confirmLabel: string;
        cancelLabel: string;
        onConfirm: (value: string) => void;
        onCancel?: () => void;
    } | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const showConfirm = useCallback((options: {
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: () => void;
        onCancel?: () => void;
        variant?: 'danger' | 'primary';
    }) => {
        setConfirmOptions({
            isOpen: true,
            title: options.title,
            message: options.message,
            confirmLabel: options.confirmLabel || 'Bestätigen',
            cancelLabel: options.cancelLabel || 'Abbrechen',
            onConfirm: () => {
                options.onConfirm();
                setConfirmOptions(null);
            },
            onCancel: () => {
                options.onCancel?.();
                setConfirmOptions(null);
            },
            variant: options.variant || 'primary'
        });
    }, []);

    const showPrompt = useCallback((options: {
        title: string;
        message: string;
        placeholder?: string;
        initialValue?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: (value: string) => void;
        onCancel?: () => void;
    }) => {
        setPromptOptions({
            isOpen: true,
            title: options.title,
            message: options.message,
            placeholder: options.placeholder,
            initialValue: options.initialValue,
            confirmLabel: options.confirmLabel || 'Bestätigen',
            cancelLabel: options.cancelLabel || 'Abbrechen',
            onConfirm: (value: string) => {
                options.onConfirm(value);
                setPromptOptions(null);
            },
            onCancel: () => {
                options.onCancel?.();
                setPromptOptions(null);
            }
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showToast, showConfirm, showPrompt }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmOptions && (
                <ConfirmDialog
                    isOpen={confirmOptions.isOpen}
                    title={confirmOptions.title}
                    message={confirmOptions.message}
                    confirmLabel={confirmOptions.confirmLabel}
                    cancelLabel={confirmOptions.cancelLabel}
                    onConfirm={confirmOptions.onConfirm}
                    onCancel={confirmOptions.onCancel || (() => setConfirmOptions(null))}
                    variant={confirmOptions.variant}
                />
            )}

            {/* Prompt Dialog */}
            {promptOptions && (
                <InputDialog
                    isOpen={promptOptions.isOpen}
                    title={promptOptions.title}
                    message={promptOptions.message}
                    placeholder={promptOptions.placeholder}
                    initialValue={promptOptions.initialValue}
                    confirmLabel={promptOptions.confirmLabel}
                    cancelLabel={promptOptions.cancelLabel}
                    onConfirm={promptOptions.onConfirm}
                    onCancel={promptOptions.onCancel || (() => setPromptOptions(null))}
                />
            )}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
