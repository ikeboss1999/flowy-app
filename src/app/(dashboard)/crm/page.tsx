"use client";

import React, { useState, useMemo } from 'react';
import { useCRM, useInquiryNotes } from '@/hooks/useCRM';
import { Inquiry, InquiryStatus, InquiryChannel } from '@/types/crm';
import { useAuth } from '@/context/AuthContext';
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import {
    Inbox,
    Phone,
    Mail,
    MapPin,
    Calendar,
    DollarSign,
    Plus,
    Trash2,
    Edit2,
    X,
    Loader2,
    MessageSquare,
    Trophy,
    TrendingUp,
    Search,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InquiryDetailModal } from '@/components/InquiryDetailModal';

const STATUS_CONFIG: Record<InquiryStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
    new: { label: 'Neu', color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100', dot: 'bg-blue-500' },
    contacted: { label: 'In Kontakt', color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100', dot: 'bg-amber-500' },
    offered: { label: 'Angebot erstellt', color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100', dot: 'bg-indigo-500' },
    won: { label: 'Gewonnen', color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100', dot: 'bg-emerald-500' },
    lost: { label: 'Verloren', color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100', dot: 'bg-rose-500' }
};

const CHANNELS: { id: InquiryChannel; label: string; color: string; bg: string }[] = [
    { id: 'phone', label: 'Telefon', color: 'text-cyan-700', bg: 'bg-cyan-50' },
    { id: 'website', label: 'Webseite', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { id: 'instagram', label: 'Instagram', color: 'text-pink-700', bg: 'bg-pink-50' },
    { id: 'email', label: 'E-Mail', color: 'text-purple-700', bg: 'bg-purple-50' },
    { id: 'recommendation', label: 'Empfehlung', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { id: 'other', label: 'Sonstiges', color: 'text-slate-700', bg: 'bg-slate-50' }
];

export default function CRMPage() {
    usePermissionGuard("crm_read");
    const { user } = useAuth();
    const { inquiries, addInquiry, updateInquiry, deleteInquiry, isLoading } = useCRM();

    // UI States
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState<InquiryStatus | 'all'>('all');

    // Form inputs for creation/editing
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [channel, setChannel] = useState<InquiryChannel>('phone');
    const [projectDescription, setProjectDescription] = useState('');
    const [location, setLocation] = useState('');
    const [budget, setBudget] = useState('');
    const [status, setStatus] = useState<InquiryStatus>('new');

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Filtered Inquiries
    const filteredInquiries = useMemo(() => {
        return inquiries.filter(inq => {
            const matchesSearch = 
                (inq.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inq.projectDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inq.location || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = activeStatusFilter === 'all' || inq.status === activeStatusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [inquiries, searchQuery, activeStatusFilter]);

    // Statistics computation
    const stats = useMemo(() => {
        const total = inquiries.length;
        if (total === 0) return { total: 0, channels: {} as Record<InquiryChannel, { count: number; pct: number }> };
        
        const channelsCount = {} as Record<InquiryChannel, number>;
        CHANNELS.forEach(c => { channelsCount[c.id] = 0; });
        
        inquiries.forEach(inq => {
            if (channelsCount[inq.channel] !== undefined) {
                channelsCount[inq.channel]++;
            } else {
                channelsCount.other = (channelsCount.other || 0) + 1;
            }
        });

        const channelsWithPct = {} as Record<InquiryChannel, { count: number; pct: number }>;
        CHANNELS.forEach(c => {
            const count = channelsCount[c.id];
            channelsWithPct[c.id] = {
                count,
                pct: Math.round((count / total) * 100)
            };
        });

        return {
            total,
            channels: channelsWithPct
        };
    }, [inquiries]);

    const handleCreateInquiry = async () => {
        if (!clientName.trim()) return;
        await addInquiry({
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            channel,
            projectDescription: projectDescription.trim(),
            location: location.trim(),
            budget: budget ? parseFloat(budget) : undefined,
            status: 'new'
        });
        resetForm();
        setIsCreateModalOpen(false);
    };

    const handleSaveInquiryEdit = async () => {
        if (!selectedInquiry || !clientName.trim()) return;
        await updateInquiry(selectedInquiry.id, {
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            channel,
            projectDescription: projectDescription.trim(),
            location: location.trim(),
            budget: budget ? parseFloat(budget) : undefined,
            status
        });
        setSelectedInquiry(prev => prev ? {
            ...prev,
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            channel,
            projectDescription: projectDescription.trim(),
            location: location.trim(),
            budget: budget ? parseFloat(budget) : undefined,
            status
        } : null);
        setIsEditMode(false);
    };

    const handleStartEdit = (inq: Inquiry) => {
        setClientName(inq.clientName);
        setClientPhone(inq.clientPhone || '');
        setClientEmail(inq.clientEmail || '');
        setChannel(inq.channel);
        setProjectDescription(inq.projectDescription || '');
        setLocation(inq.location || '');
        setBudget(inq.budget?.toString() || '');
        setStatus(inq.status);
        setIsEditMode(true);
    };

    const handleDeleteInquiryConfirm = async () => {
        if (!selectedInquiry) return;
        await deleteInquiry(selectedInquiry.id);
        setSelectedInquiry(null);
        setConfirmDeleteOpen(false);
    };

    const resetForm = () => {
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        setChannel('phone');
        setProjectDescription('');
        setLocation('');
        setBudget('');
        setStatus('new');
        setIsEditMode(false);
    };

    if (isLoading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">CRM-Daten werden geladen...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            {/* Header Area */}
            <div className="flex justify-between items-end flex-wrap gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Inbox className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Vertrieb & CRM</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        Anfragen <span className="text-slate-300 font-light">& CRM</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">Verwalten Sie eingehende Anfragen und die Kundenkommunikation.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                    className="bg-primary-gradient text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all font-outfit text-sm"
                >
                    <Plus className="h-5 w-5" /> Neue Anfrage erfassen
                </button>
            </div>

            {/* Feature 3: Origin Statistics Widget */}
            {stats.total > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-sm font-black text-slate-800 font-outfit uppercase tracking-wider">Herkunft der Anfragen ({stats.total} Gesamt)</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {CHANNELS.map(ch => {
                            const data = stats.channels[ch.id] || { count: 0, pct: 0 };
                            return (
                                <div key={ch.id} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn("inline-block w-2.5 h-2.5 rounded-full", ch.bg, ch.color.replace('text', 'bg'))}></span>
                                        <span className="text-xs font-bold text-slate-500 font-outfit">{ch.label}</span>
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-1.5">
                                        <span className="text-2xl font-black text-slate-800 font-outfit">{data.count}</span>
                                        <span className="text-xs font-semibold text-slate-400 font-outfit">({data.pct}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className={cn("h-full rounded-full", ch.color.replace('text', 'bg'))} style={{ width: `${data.pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filters & Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 group max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Anfragen suchen nach Name, Vorhaben, Ort..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                    />
                </div>

                {/* Status Tabs Filter */}
                <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-1">
                    <button
                        onClick={() => setActiveStatusFilter('all')}
                        className={cn(
                            "px-4 py-2 rounded-xl font-bold text-xs transition-all",
                            activeStatusFilter === 'all'
                                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Alle
                    </button>
                    {(Object.keys(STATUS_CONFIG) as InquiryStatus[]).map((stKey) => {
                        const config = STATUS_CONFIG[stKey];
                        const count = inquiries.filter(i => i.status === stKey).length;
                        return (
                            <button
                                key={stKey}
                                onClick={() => setActiveStatusFilter(stKey)}
                                className={cn(
                                    "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5",
                                    activeStatusFilter === stKey
                                        ? cn("shadow-sm", config.bg, config.color)
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                                {config.label}
                                <span className="text-[10px] opacity-60">({count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tabular List View */}
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/50">
                                <th className="py-4 px-6">Kunde</th>
                                <th className="py-4 px-6">Bauvorhaben</th>
                                <th className="py-4 px-6">Ort</th>
                                <th className="py-4 px-6">Kanal</th>
                                <th className="py-4 px-6">Budget</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6">Erfasst am</th>
                                <th className="py-4 px-6 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInquiries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-400 font-medium font-outfit">
                                        <Inbox className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                        Keine Anfragen in dieser Ansicht gefunden.
                                    </td>
                                </tr>
                            ) : (
                                filteredInquiries.map((inq) => {
                                    const statusDef = STATUS_CONFIG[inq.status];
                                    const channelDef = CHANNELS.find(c => c.id === inq.channel);
                                    
                                    // Generate initials for customer avatar
                                    const initials = inq.clientName
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase() || '?';

                                    return (
                                        <tr
                                            key={inq.id}
                                            onClick={() => { setSelectedInquiry(inq); setIsEditMode(false); }}
                                            className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                                        >
                                            {/* Client Info */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 font-black text-sm flex items-center justify-center shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{inq.clientName}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                                            {inq.clientPhone && <span>{inq.clientPhone}</span>}
                                                            {inq.clientPhone && inq.clientEmail && <span>•</span>}
                                                            {inq.clientEmail && <span className="truncate max-w-[150px]">{inq.clientEmail}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Description */}
                                            <td className="py-4 px-6">
                                                <div className="text-sm font-semibold text-slate-700 line-clamp-1 max-w-xs">
                                                    {inq.projectDescription || <span className="text-slate-300 font-light italic">Keine Beschreibung</span>}
                                                </div>
                                            </td>

                                            {/* Location */}
                                            <td className="py-4 px-6">
                                                <div className="text-sm font-bold text-slate-600 flex items-center gap-1">
                                                    <MapPin className="h-4 w-4 text-slate-300 shrink-0" />
                                                    <span>{inq.location || '—'}</span>
                                                </div>
                                            </td>

                                            {/* Channel */}
                                            <td className="py-4 px-6">
                                                <span className={cn("px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider font-outfit", channelDef?.bg, channelDef?.color)}>
                                                    {channelDef?.label || inq.channel}
                                                </span>
                                            </td>

                                            {/* Budget */}
                                            <td className="py-4 px-6">
                                                <div className="text-sm font-black text-slate-700">
                                                    {inq.budget ? `${inq.budget.toLocaleString('de-DE')} €` : '—'}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-6">
                                                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", statusDef.bg, statusDef.color, statusDef.border)}>
                                                    <span className={cn("h-1.5 w-1.5 rounded-full", statusDef.dot)} />
                                                    {statusDef.label}
                                                </div>
                                            </td>

                                            {/* Created At */}
                                            <td className="py-4 px-6">
                                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-350" />
                                                    <span>{new Date(inq.createdAt).toLocaleDateString('de-DE')}</span>
                                                </div>
                                            </td>

                                            {/* Arrow/Edit indicator */}
                                            <td className="py-4 px-6 text-right">
                                                <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Inquiry Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-xl font-black text-slate-900 font-outfit">Neue Anfrage erfassen</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Kundenname *</label>
                                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" placeholder="z.B. Hans Müller" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Telefon</label>
                                    <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" placeholder="z.B. 0664 1234567" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">E-Mail</label>
                                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" placeholder="z.B. hans@web.at" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Ort / PLZ</label>
                                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" placeholder="z.B. Wien" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Kanal *</label>
                                    <select value={channel} onChange={e => setChannel(e.target.value as InquiryChannel)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit">
                                        {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Budget (€)</label>
                                    <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" placeholder="z.B. 15000" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Bauvorhaben / Beschreibung</label>
                                <textarea rows={3} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" placeholder="z.B. Pflasterarbeiten im Hof..." />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8 border-t border-slate-100 pt-6">
                            <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors font-outfit">Abbrechen</button>
                            <button onClick={handleCreateInquiry} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors font-outfit">Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedInquiry && !isEditMode && (
                <InquiryDetailModal
                    isOpen={!!selectedInquiry}
                    onClose={() => setSelectedInquiry(null)}
                    inquiry={selectedInquiry}
                    onStartEdit={(inq) => handleStartEdit(inq)}
                    onDelete={() => setConfirmDeleteOpen(true)}
                />
            )}

            {/* Edit Inquiry Modal */}
            {selectedInquiry && isEditMode && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-xl font-black text-slate-900 font-outfit">Anfrage bearbeiten</h3>
                            <button onClick={() => setIsEditMode(false)} className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Kundenname *</label>
                                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Telefon</label>
                                    <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">E-Mail</label>
                                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Ort / PLZ</label>
                                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Kanal *</label>
                                    <select value={channel} onChange={e => setChannel(e.target.value as InquiryChannel)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit">
                                        {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Status *</label>
                                    <select value={status} onChange={e => setStatus(e.target.value as InquiryStatus)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit">
                                        {(Object.keys(STATUS_CONFIG) as InquiryStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Budget (€)</label>
                                    <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Bauvorhaben / Beschreibung</label>
                                <textarea rows={3} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 mt-1.5 font-outfit" />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8 border-t border-slate-100 pt-6">
                            <button onClick={() => setIsEditMode(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors font-outfit">Abbrechen</button>
                            <button onClick={handleSaveInquiryEdit} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors font-outfit">Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={confirmDeleteOpen}
                title="Anfrage löschen"
                message="Möchtest du diese Anfrage wirklich unwiderruflich löschen? Alle zugehörigen Notizen werden ebenfalls gelöscht."
                confirmLabel="Löschen"
                cancelLabel="Abbrechen"
                variant="danger"
                onConfirm={handleDeleteInquiryConfirm}
                onCancel={() => setConfirmDeleteOpen(false)}
            />
        </div>
    );
}

// Inner component for the Notes Timeline
function InquiryNotesTimeline({ inquiryId }: { inquiryId: string }) {
    const { notes, addNote, deleteNote, isLoading } = useInquiryNotes(inquiryId);
    const { user } = useAuth();
    const [newNoteText, setNewNoteText] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoteText.trim() || isSavingNote) return;
        setIsSavingNote(true);
        try {
            const userName = user?.email?.split('@')[0] || 'Admin';
            await addNote(newNoteText.trim(), userName);
            setNewNoteText('');
        } finally {
            setIsSavingNote(false);
        }
    };

    return (
        <div className="border-t border-slate-100 pt-6 space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider font-outfit flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                Gesprächsverlauf & Notizen ({notes.length})
            </h4>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                    type="text"
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    disabled={isSavingNote}
                    placeholder="Neue Notiz hinzufügen..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 font-outfit"
                />
                <button
                    type="submit"
                    disabled={!newNoteText.trim() || isSavingNote}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all font-outfit shrink-0 flex items-center justify-center"
                >
                    {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hinzufügen'}
                </button>
            </form>

            {/* Note Timeline List */}
            {isLoading ? (
                <div className="py-4 text-center text-xs text-slate-400">Notizen werden geladen...</div>
            ) : notes.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium font-outfit italic">
                    Bisher keine Notizen erfasst. Schreibe die erste Notiz, um den Verlauf zu dokumentieren.
                </div>
            ) : (
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-5 py-2">
                    {notes.map(note => (
                        <div key={note.id} className="relative group/note">
                            <span className="absolute -left-[31px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                            
                            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 shadow-sm relative">
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-wider font-outfit">
                                    <span>{(note as any).createdBy || (note as any).created_by || (note as any).createdby || 'Admin'}</span>
                                    <span>
                                        {(() => {
                                            const dateVal = (note as any).createdAt || (note as any).created_at || (note as any).createdat;
                                            if (!dateVal) return '—';
                                            const d = new Date(dateVal);
                                            if (isNaN(d.getTime())) return '—';
                                            return `${d.toLocaleDateString('de-DE')} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
                                        })()}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-slate-600 mt-2 font-outfit leading-relaxed break-words whitespace-pre-wrap">{note.content}</p>
                                
                                <button
                                    onClick={() => deleteNote(note.id)}
                                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/note:opacity-100 transition-opacity rounded-lg hover:bg-slate-100/50"
                                    title="Notiz löschen"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
