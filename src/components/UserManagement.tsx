"use client";

import React, { useState, useEffect } from 'react';
import {
    Users,
    Shield,
    Mail,
    Plus,
    Trash2,
    Check,
    AlertCircle,
    UserPlus,
    X,
    Calendar,
    Briefcase,
    FileText,
    Car,
    FileSignature,
    FolderOpen,
    BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRole {
    user_id: string;
    company_owner_id: string;
    role: 'admin' | 'employee' | 'developer';
    permissions: Record<string, boolean>;
    status: 'active' | 'pending';
    email?: string;
    name?: string;
}

const DEFAULT_PERMISSIONS = {
    calendar_use: false,
    crm_read: false,
    crm_write: false,
    customers_read: false,
    customers_write: false,
    projects_read: false,
    projects_write: false,
    projects_files_read: false,
    vehicles_use: false,
    employees_read: false,
    employees_create: false,
    employees_write: false,
    offers_read: false,
    offers_write: false,
    orders_read: false,
    orders_write: false,
    invoices_read: false,
    invoices_write: false,
    dunning_read: false,
    dunning_write: false,
    reports_read: false,
    archive_read: false
};

const PERMISSION_METADATA = [
    { key: 'calendar_use', label: 'Kalender nutzen', category: 'Allgemein', icon: Calendar },
    { key: 'archive_read', label: 'Dokumenten-Archiv einsehen', category: 'Allgemein', icon: FolderOpen },
    { key: 'vehicles_use', label: 'Fahrzeuge einsehen', category: 'Allgemein', icon: Car },
    
    { key: 'crm_read', label: 'Anfragen lesen', category: 'CRM', icon: Mail },
    { key: 'crm_write', label: 'Anfragen bearbeiten / erstellen', category: 'CRM', icon: Mail },
    
    { key: 'customers_read', label: 'Kunden einsehen', category: 'CRM', icon: Users },
    { key: 'customers_write', label: 'Kunden erstellen / bearbeiten', category: 'CRM', icon: Users },
    
    { key: 'projects_read', label: 'Projekte einsehen', category: 'Projekte', icon: Briefcase },
    { key: 'projects_write', label: 'Projekte erstellen / bearbeiten', category: 'Projekte', icon: Briefcase },
    { key: 'projects_files_read', label: 'Projektdateien einsehen', category: 'Projekte', icon: Briefcase },
    
    { key: 'time_tracking_use', label: 'Zeiten erfassen', category: 'Personal', icon: Users },
    { key: 'employees_read', label: 'Mitarbeiterliste einsehen', category: 'Personal', icon: Users },
    { key: 'employees_create', label: 'Mitarbeiter erstellen', category: 'Personal', icon: Users },
    { key: 'employees_write', label: 'Mitarbeiter & Zeiterfassung bearbeiten', category: 'Personal', icon: Users },
    
    { key: 'offers_read', label: 'Angebote einsehen', category: 'Finanzen', icon: FileText },
    { key: 'offers_write', label: 'Angebote erstellen / bearbeiten', category: 'Finanzen', icon: FileText },
    
    { key: 'orders_read', label: 'Aufträge einsehen', category: 'Finanzen', icon: FileSignature },
    { key: 'orders_write', label: 'Aufträge erstellen / bearbeiten', category: 'Finanzen', icon: FileSignature },
    
    { key: 'invoices_read', label: 'Rechnungen einsehen', category: 'Finanzen', icon: FileText },
    { key: 'invoices_write', label: 'Rechnungen erstellen / bearbeiten', category: 'Finanzen', icon: FileText },
    
    { key: 'dunning_read', label: 'Mahnwesen einsehen', category: 'Finanzen', icon: AlertCircle },
    { key: 'dunning_write', label: 'Mahnungen erstellen / bearbeiten', category: 'Finanzen', icon: AlertCircle },
    
    { key: 'reports_read', label: 'Auswertungen / Statistiken einsehen', category: 'Finanzen', icon: BarChart3 },
];

export function UserManagement() {
    const [users, setUsers] = useState<UserRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'employee'>('employee');
    const [invitePermissions, setInvitePermissions] = useState<Record<string, boolean>>({ ...DEFAULT_PERMISSIONS });
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/settings/users');
            if (!res.ok) throw new Error('Benutzerliste konnte nicht geladen werden.');
            const data = await res.json();
            setUsers(data);
            if (data.length > 0 && !selectedUser) {
                setSelectedUser(data[0]);
            } else if (selectedUser) {
                const refreshed = data.find((u: UserRole) => u.user_id === selectedUser.user_id);
                if (refreshed) setSelectedUser(refreshed);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handlePermissionToggle = (key: string) => {
        if (!selectedUser) return;
        
        const updatedPermissions = {
            ...(selectedUser.permissions || {}),
            [key]: !selectedUser.permissions?.[key]
        };

        setSelectedUser({
            ...selectedUser,
            permissions: updatedPermissions
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/settings/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.user_id,
                    role: selectedUser.role,
                    permissions: selectedUser.permissions
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Fehler beim Speichern der Berechtigungen.');
            }

            await fetchUsers();
            showToast('Berechtigungen erfolgreich aktualisiert.');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        setInviteError(null);
        try {
            const res = await fetch('/api/settings/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    name: inviteName.trim(),
                    role: inviteRole,
                    permissions: inviteRole === 'admin' ? { '*': true } : invitePermissions
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Fehler bei der Einladung.');
            }

            setInviteEmail('');
            setInviteName('');
            setInviteRole('employee');
            setInvitePermissions({ ...DEFAULT_PERMISSIONS });
            setShowInviteModal(false);
            await fetchUsers();
            showToast('Einladung wurde erfolgreich versendet.');
        } catch (err: any) {
            setInviteError(err.message);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleDeleteUser = (userId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Mitarbeiter löschen',
            message: 'Möchten Sie diesen Benutzer wirklich löschen? Der Zugriff wird sofort widerrufen.',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/settings/users?userId=${userId}`, {
                        method: 'DELETE'
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Benutzer konnte nicht gelöscht werden.');
                    }

                    if (selectedUser?.user_id === userId) {
                        setSelectedUser(null);
                    }
                    await fetchUsers();
                    showToast('Benutzer erfolgreich gelöscht.');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            }
        });
    };

    const categories = Array.from(new Set(PERMISSION_METADATA.map(m => m.category)));

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100/50">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Benutzerverwaltung</h2>
                        <p className="text-sm text-slate-500 font-medium">
                            Verwalten Sie Büro-Mitarbeiter und deren Zugriffsrechte.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all text-sm"
                >
                    <UserPlus className="h-4 w-4" />
                    Mitarbeiter einladen
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Users List */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-lg">Mitarbeiter-Accounts</h3>
                    <div className="space-y-3">
                        {users.map((user) => {
                            const isSelected = selectedUser?.user_id === user.user_id;
                            return (
                                <div
                                    key={user.user_id}
                                    onClick={() => setSelectedUser(user)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-300",
                                        isSelected
                                            ? "border-indigo-600 bg-indigo-50/30 shadow-md shadow-indigo-100/10"
                                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                                    )}
                                >
                                    <div className="space-y-1">
                                        <div className="font-black text-slate-800 text-sm flex items-center gap-2">
                                            {user.name}
                                            {user.role === 'admin' && (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium break-all">{user.email}</div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                user.status === 'active' ? "bg-emerald-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                {user.status === 'active' ? 'Aktiv' : 'Ausstehend'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteUser(user.user_id);
                                        }}
                                        className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all active:scale-95"
                                        title="Benutzer löschen"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}

                        {users.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-sm font-medium">
                                Keine Mitarbeiter-Accounts vorhanden.
                            </div>
                        )}
                    </div>
                </div>

                {/* Permissions Config */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    {selectedUser ? (
                        <>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Berechtigungen für {selectedUser.name}</h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Rolle: <span className="capitalize text-slate-600 font-bold">{selectedUser.role}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={handleSavePermissions}
                                    disabled={isSaving || selectedUser.role === 'admin'}
                                    className={cn(
                                        "bg-indigo-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-95 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                >
                                    {isSaving ? 'Speichert...' : 'Speichern'}
                                </button>
                            </div>

                            {selectedUser.role === 'admin' ? (
                                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                                    <Shield className="h-8 w-8 text-indigo-600 mx-auto" />
                                    <h4 className="font-bold text-slate-700">Vollzugriff (Admin)</h4>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                                        Administratoren haben uneingeschränkten Lese- und Schreibzugriff auf alle Bereiche der eigenen Firma. Einzelberechtigungen müssen nicht vergeben werden.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {categories.map(category => (
                                        <div key={category} className="space-y-3">
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                {category}
                                            </h4>
                                            <div className="space-y-2">
                                                {PERMISSION_METADATA.filter(m => m.category === category).map((perm) => {
                                                    const isChecked = !!selectedUser.permissions?.[perm.key];
                                                    const PermIcon = perm.icon;
                                                    return (
                                                        <div
                                                            key={perm.key}
                                                            onClick={() => handlePermissionToggle(perm.key)}
                                                            className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 cursor-pointer transition-all"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-indigo-50/30 rounded-xl border border-indigo-100/10 text-indigo-600">
                                                                    <PermIcon className="h-4 w-4" />
                                                                </div>
                                                                <span className="text-sm font-semibold text-slate-700">{perm.label}</span>
                                                            </div>
                                                            {/* Custom Toggle Switch */}
                                                            <div className={cn(
                                                                "w-11 h-6 rounded-full p-0.5 transition-all duration-300 relative",
                                                                isChecked ? "bg-indigo-600" : "bg-slate-200"
                                                            )}>
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 absolute top-0.5",
                                                                    isChecked ? "right-0.5" : "left-0.5"
                                                                )} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 text-slate-400 text-sm font-medium">
                            Bitte wählen Sie einen Mitarbeiter aus der Liste aus.
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-white/30 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-2xl max-w-lg w-full space-y-6 relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowInviteModal(false)}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Mitarbeiter einladen</h3>
                                <p className="text-xs text-slate-400 font-medium">Geben Sie die Zugangsdaten für den neuen Login ein.</p>
                            </div>
                        </div>

                        {inviteError && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {inviteError}
                            </div>
                        )}

                        <form onSubmit={handleInviteUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Vollständiger Name</label>
                                <input
                                    type="text"
                                    required
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    placeholder="z. B. Max Mustermann"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">E-Mail-Adresse</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="max.mustermann@firma.de"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Rolle</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as any)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-800"
                                >
                                    <option value="employee">Mitarbeiter (Eingeschränkter Zugang)</option>
                                    <option value="admin">Administrator (Vollzugriff)</option>
                                </select>
                            </div>

                            {inviteRole === 'employee' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-600 ml-1">Standard-Rechte aktivieren</label>
                                    <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-[160px] overflow-y-auto custom-scrollbar">
                                        {PERMISSION_METADATA.map((perm) => {
                                            const isChecked = invitePermissions[perm.key];
                                            return (
                                                <div
                                                    key={perm.key}
                                                    onClick={() => setInvitePermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                                                    className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg transition-all"
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        isChecked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
                                                    )}>
                                                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-600 select-none truncate" title={perm.label}>
                                                        {perm.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition-all active:scale-95 text-sm"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95 text-sm"
                                >
                                    {inviteLoading ? 'Wird eingeladen...' : 'Einladung senden'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Toast Notification */}
            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-[110] flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-top-4 duration-300",
                    toast.type === 'success' 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-rose-50 border-rose-200 text-rose-800"
                )}>
                    {toast.type === 'success' ? (
                        <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-sm font-semibold">{toast.message}</span>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmDialog?.isOpen && (
                <div className="fixed inset-0 bg-white/30 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-2xl max-w-md w-full space-y-6 relative animate-in zoom-in-95 duration-300 text-center">
                        <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto animate-bounce">
                            <Trash2 className="h-8 w-8" />
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-800">{confirmDialog.title}</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                {confirmDialog.message}
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition-all active:scale-95 text-sm"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={() => {
                                    confirmDialog.onConfirm();
                                    setConfirmDialog(null);
                                }}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-rose-100 active:scale-95 text-sm"
                            >
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
