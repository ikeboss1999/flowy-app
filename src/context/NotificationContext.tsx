"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showToast, showConfirm }}>
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
