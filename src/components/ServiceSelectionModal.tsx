import React, { useMemo, useState } from 'react';
import {
    BookOpen,
    BriefcaseBusiness,
    FileText,
    PackageSearch,
    Plus,
    Search,
    Sparkles,
    X,
} from 'lucide-react';
import { Service } from '@/types/service';
import { cn } from '@/lib/utils';

interface ServiceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (service: Service) => void;
    services: Service[];
    onCreateNew: () => void;
}

const formatPrice = (price: number) =>
    new Intl.NumberFormat('de-AT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
    }).format(price || 0);

const getCategoryLabel = (service: Service) => {
    if (service.category === 'Position') return 'Positions-Vorlage';
    if (service.category === 'Labor') return 'Arbeitsleistung';
    if (service.category === 'Material') return 'Material';
    if (service.category === 'FlatRate') return 'Pauschale';
    return 'Leistung';
};

export function ServiceSelectionModal({ isOpen, onClose, onSelect, services, onCreateNew }: ServiceSelectionModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'services' | 'positions'>('services');

    const serviceCount = useMemo(() => services.filter((service) => service.category !== 'Position').length, [services]);
    const positionCount = useMemo(() => services.filter((service) => service.category === 'Position').length, [services]);

    const filteredServices = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return services.filter((service) => {
            const matchesSearch =
                !query ||
                service.title.toLowerCase().includes(query) ||
                service.description?.toLowerCase().includes(query) ||
                service.folder?.toLowerCase().includes(query);

            const isPosition = service.category === 'Position';
            const matchesTab = activeTab === 'positions' ? isPosition : !isPosition;

            return matchesSearch && matchesTab;
        });
    }, [activeTab, searchTerm, services]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-6 backdrop-blur-md">
            <div className="flex max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.35)]">
                <aside className="hidden w-72 shrink-0 flex-col justify-between bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-600 p-7 text-white lg:flex">
                    <div>
                        <div className="mb-7 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                            <BookOpen className="h-7 w-7" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100">Katalog</p>
                        <h3 className="mt-3 text-3xl font-black leading-tight">Vorlage auswählen</h3>
                        <p className="mt-4 text-sm font-semibold leading-6 text-white/75">
                            Leistungen und Positions-Vorlagen direkt in das aktuelle Dokument übernehmen.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                            <p className="text-2xl font-black">{serviceCount}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/65">Leistungen</p>
                        </div>
                        <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                            <p className="text-2xl font-black">{positionCount}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/65">Vorlagen</p>
                        </div>
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    <header className="border-b border-slate-100 bg-white px-6 py-5 sm:px-7">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                    <PackageSearch className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-500">Katalog-Auswahl</p>
                                    <h3 className="mt-1 truncate text-2xl font-black text-slate-950">Leistung oder Vorlage wählen</h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onCreateNew}
                                    className="hidden items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 sm:flex"
                                >
                                    <Plus className="h-4 w-4" />
                                    Neu anlegen
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                    aria-label="Auswahl schließen"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Nach Titel, Beschreibung oder Ordner suchen..."
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                                    autoFocus
                                />
                            </div>

                            <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                                <button
                                    onClick={() => setActiveTab('services')}
                                    className={cn(
                                        'flex min-w-32 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition',
                                        activeTab === 'services'
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    )}
                                >
                                    <BriefcaseBusiness className="h-4 w-4" />
                                    Leistungen ({serviceCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab('positions')}
                                    className={cn(
                                        'flex min-w-40 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition',
                                        activeTab === 'positions'
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    )}
                                >
                                    <FileText className="h-4 w-4" />
                                    Positions-Vorlagen ({positionCount})
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-4 sm:p-6">
                        {filteredServices.length === 0 ? (
                            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500">
                                    <Sparkles className="h-8 w-8" />
                                </div>
                                <h4 className="text-lg font-black text-slate-900">Keine passenden Einträge gefunden</h4>
                                <p className="mt-2 max-w-sm text-sm font-semibold text-slate-500">
                                    Passe die Suche an oder lege direkt eine neue Vorlage im Katalog an.
                                </p>
                                <button
                                    onClick={onCreateNew}
                                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    Neuen Eintrag erstellen
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredServices.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => onSelect(service)}
                                        className="group grid w-full gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70 sm:grid-cols-[1fr_auto]"
                                    >
                                        <div className="min-w-0">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                                    {getCategoryLabel(service)}
                                                </span>
                                                {service.folder && (
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                        {service.folder}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="truncate text-lg font-black text-slate-950 group-hover:text-indigo-700">
                                                {service.title}
                                            </h4>
                                            {service.description ? (
                                                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                                                    {service.description}
                                                </p>
                                            ) : (
                                                <p className="mt-1 text-sm font-semibold text-slate-400">Keine Beschreibung hinterlegt.</p>
                                            )}
                                        </div>

                                        <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end">
                                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right ring-1 ring-slate-100">
                                                <p className="text-lg font-black text-slate-950">{formatPrice(service.price)}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">pro {service.unit}</p>
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-indigo-500 opacity-0 transition group-hover:opacity-100">
                                                Übernehmen
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <footer className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 sm:px-7">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                            {filteredServices.length} {filteredServices.length === 1 ? 'Eintrag' : 'Einträge'} angezeigt
                        </span>
                        <button
                            onClick={onCreateNew}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:hidden"
                        >
                            <Plus className="h-4 w-4" />
                            Neu
                        </button>
                    </footer>
                </section>
            </div>
        </div>
    );
}
