import React, { useMemo, useState } from 'react';
import {
    BookOpen,
    BriefcaseBusiness,
    Check,
    ChevronDown,
    ChevronRight,
    FileText,
    Folder,
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
    onSelectMany?: (services: Service[]) => void;
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

function SelectionRow({
    service,
    isSelected,
    onToggle,
}: {
    service: Service;
    isSelected: boolean;
    onToggle: (service: Service) => void;
}) {
    const isPosition = service.category === 'Position';

    return (
        <button
            type="button"
            onClick={() => onToggle(service)}
            className={cn(
                'group grid w-full gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg sm:grid-cols-[42px_1fr_150px]',
                isSelected ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'
            )}
        >
            <div className="flex items-start justify-center pt-1">
                <span className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg border transition-all',
                    isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-slate-50 text-transparent group-hover:border-indigo-300'
                )}>
                    <Check className="h-4 w-4" />
                </span>
            </div>

            <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                        isPosition ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-700'
                    )}>
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
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                    {service.description || 'Keine Beschreibung hinterlegt.'}
                </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right ring-1 ring-slate-100">
                    <p className="text-lg font-black text-slate-950">{formatPrice(service.price)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">pro {service.unit}</p>
                </div>
            </div>
        </button>
    );
}

export function ServiceSelectionModal({ isOpen, onClose, onSelect, onSelectMany, services, onCreateNew }: ServiceSelectionModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'services' | 'positions'>('services');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    const serviceCount = useMemo(() => services.filter((service) => service.category !== 'Position').length, [services]);
    const positionCount = useMemo(() => services.filter((service) => service.category === 'Position').length, [services]);

    const filteredServices = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return services
            .filter((service) => {
                const matchesSearch =
                    !query ||
                    service.title.toLowerCase().includes(query) ||
                    service.description?.toLowerCase().includes(query) ||
                    service.folder?.toLowerCase().includes(query) ||
                    service.unit?.toLowerCase().includes(query);

                const isPosition = service.category === 'Position';
                const matchesTab = activeTab === 'positions' ? isPosition : !isPosition;

                return matchesSearch && matchesTab;
            })
            .sort((a, b) => {
                const folderCompare = (a.folder || '').localeCompare(b.folder || '', 'de', { sensitivity: 'base' });
                if (activeTab === 'positions' && folderCompare !== 0) return folderCompare;
                return a.title.localeCompare(b.title, 'de', { sensitivity: 'base' });
            });
    }, [activeTab, searchTerm, services]);

    const selectedServices = useMemo(
        () => selectedIds
            .map((id) => services.find((service) => service.id === id))
            .filter((service): service is Service => Boolean(service)),
        [selectedIds, services]
    );

    const groupedPositions = useMemo(() => {
        const groups = new Map<string, Service[]>();
        filteredServices.forEach((service) => {
            const folderName = service.folder || 'Nicht zugeordnet';
            const group = groups.get(folderName) || [];
            group.push(service);
            groups.set(folderName, group);
        });
        return Array.from(groups.entries());
    }, [filteredServices]);

    if (!isOpen) return null;

    const isPositionTab = activeTab === 'positions';
    const shownCount = filteredServices.length;

    const handleTabChange = (tab: 'services' | 'positions') => {
        setActiveTab(tab);
        setSelectedIds([]);
    };

    const toggleSelection = (service: Service) => {
        setSelectedIds((prev) =>
            prev.includes(service.id)
                ? prev.filter((id) => id !== service.id)
                : [...prev, service.id]
        );
    };

    const handleClose = () => {
        setSelectedIds([]);
        onClose();
    };

    const handleApplySelection = () => {
        if (selectedServices.length === 0) return;
        if (selectedServices.length === 1) {
            onSelect(selectedServices[0]);
        } else if (onSelectMany) {
            onSelectMany(selectedServices);
        } else {
            selectedServices.forEach(onSelect);
        }
        setSelectedIds([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-white/30 p-4 backdrop-blur-sm">
            <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.35)]">
                <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-6 text-white sm:px-8">
                    <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />

                    <button
                        onClick={handleClose}
                        className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/70 transition hover:bg-white hover:text-indigo-700"
                        aria-label="Auswahl schliessen"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="relative pr-14">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/15">
                                    <BookOpen className="h-7 w-7" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-100">Katalog-Auswahl</p>
                                    <h3 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">
                                        Leistung oder Vorlage waehlen
                                    </h3>
                                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/65">
                                        Eine oder mehrere Positionen aus dem Katalog uebernehmen.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                                        <p className="text-2xl font-black">{serviceCount}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Leistungen</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                                        <p className="text-2xl font-black">{positionCount}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Vorlagen</p>
                                    </div>
                                </div>
                                <button
                            onClick={onCreateNew}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-black/10 transition hover:-translate-y-0.5"
                                >
                                    <Plus className="h-4 w-4" />
                                    Neu anlegen
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-7">
                    <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Nach Titel, Beschreibung, Einheit oder Ordner suchen..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm font-bold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                            <button
                                onClick={() => handleTabChange('services')}
                                className={cn(
                                    'flex min-w-40 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition',
                                    activeTab === 'services'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                )}
                            >
                                <BriefcaseBusiness className="h-4 w-4" />
                                Leistungen ({serviceCount})
                            </button>
                            <button
                                onClick={() => handleTabChange('positions')}
                                className={cn(
                                    'flex min-w-48 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition',
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
                        <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <h4 className="text-lg font-black text-slate-900">Keine passenden Eintraege gefunden</h4>
                            <p className="mt-2 max-w-sm text-sm font-semibold text-slate-500">
                                Suche anpassen oder direkt einen neuen Katalogeintrag anlegen.
                            </p>
                            <button
                                onClick={onCreateNew}
                                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                            >
                                <Plus className="h-4 w-4" />
                                Neuen Eintrag erstellen
                            </button>
                        </div>
                    ) : isPositionTab ? (
                        <div className="space-y-3">
                            {groupedPositions.map(([folderName, folderServices]) => {
                                const isExpanded = expandedFolders[folderName] === true;
                                const selectedInFolder = folderServices.filter((service) => selectedIds.includes(service.id)).length;

                                return (
                                    <section key={folderName} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedFolders((prev) => ({ ...prev, [folderName]: !isExpanded }))}
                                            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <Folder className="h-4 w-4 shrink-0 text-indigo-500" />
                                                        <h4 className="truncate text-base font-black text-slate-900">{folderName}</h4>
                                                    </div>
                                                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                                                        {folderServices.length} Position{folderServices.length === 1 ? '' : 'en'}
                                                        {selectedInFolder > 0 ? `, ${selectedInFolder} ausgewaehlt` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 ring-1 ring-slate-200">
                                                {isExpanded ? 'Offen' : 'Eingeklappt'}
                                            </span>
                                        </button>

                                        {isExpanded && (
                                            <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 p-3">
                                                {folderServices.map((service) => (
                                                    <SelectionRow
                                                        key={service.id}
                                                        service={service}
                                                        isSelected={selectedIds.includes(service.id)}
                                                        onToggle={toggleSelection}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredServices.map((service) => (
                                <SelectionRow
                                    key={service.id}
                                    service={service}
                                    isSelected={selectedIds.includes(service.id)}
                                    onToggle={toggleSelection}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {shownCount} {shownCount === 1 ? 'Eintrag' : 'Eintraege'} angezeigt
                    </span>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
                            >
                                Auswahl leeren
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleApplySelection}
                            disabled={selectedIds.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
                        >
                            <Check className="h-4 w-4" />
                            {selectedIds.length > 0 ? `${selectedIds.length} einfuegen` : 'Auswahl einfuegen'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
