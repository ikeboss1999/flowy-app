"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Search, 
    User, 
    Building2, 
    Check, 
    ChevronDown, 
    Plus, 
    X, 
    Phone, 
    Mail, 
    MapPin, 
    Briefcase,
    ArrowUpDown,
    Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/types/customer';

interface CustomerSearchSelectProps {
    customers: Customer[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddNew: () => void;
    placeholder?: string;
    className?: string;
}

export function CustomerSearchSelect({
    customers,
    selectedId,
    onSelect,
    onAddNew,
    placeholder = "Kunde auswählen...",
    className
}: CustomerSearchSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'private' | 'business'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'number' | 'recent'>('name');
    const modalRef = useRef<HTMLDivElement>(null);

    const selectableCustomers = useMemo(
        () => customers.filter((customer) => customer.status !== "draft"),
        [customers]
    );

    const selectedCustomer = useMemo(() =>
        selectableCustomers.find(c => c.id === selectedId),
        [selectableCustomers, selectedId]);

    // Filter and sort customer list
    const processedCustomers = useMemo(() => {
        let result = selectableCustomers.filter(c => {
            const lowSearch = search.toLowerCase();
            const nameMatch = (c.name || '').toLowerCase().includes(lowSearch);
            const emailMatch = (c.email || '').toLowerCase().includes(lowSearch);
            const phoneMatch = (c.phone || '').toLowerCase().includes(lowSearch);
            const numberMatch = (c.customer_number || '').toLowerCase().includes(lowSearch);
            return nameMatch || emailMatch || phoneMatch || numberMatch;
        });

        if (filterType !== 'all') {
            result = result.filter(c => c.type === filterType);
        }

        return [...result].sort((a, b) => {
            if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            } else if (sortBy === 'number') {
                const numA = a.customer_number || '';
                const numB = b.customer_number || '';
                return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
            } else {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            }
        });
    }, [selectableCustomers, search, filterType, sortBy]);

    // Handle clicks outside the modal to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden'; // Lock scroll background
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const typeLabels = {
        private: { label: 'Privat', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: User },
        business: { label: 'Geschäftlich', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Briefcase }
    };

    return (
        <div className={cn("relative", className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-all hover:border-indigo-500/50 hover:shadow-sm focus:ring-4 focus:ring-indigo-500/10",
                    isOpen && "border-indigo-500 ring-4 ring-indigo-500/10"
                )}
            >
                {selectedCustomer ? (
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center border",
                            selectedCustomer.type === 'business' ? "bg-emerald-50 border-emerald-100 text-emerald-500" : "bg-purple-50 border-purple-100 text-purple-500"
                        )}>
                            {selectedCustomer.type === 'business' ? <Briefcase className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-900 font-extrabold leading-tight">{selectedCustomer.name}</span>
                                {selectedCustomer.customer_number && (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                        {selectedCustomer.customer_number}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {typeLabels[selectedCustomer.type].label}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400 font-medium">{placeholder}</span>
                )}
                <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            {/* Modal Overlay */}
            {isOpen && typeof document !== 'undefined' && createPortal((
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-8 bg-white/30 animate-in fade-in duration-200">
                    {/* Modal Box */}
                    <div 
                        ref={modalRef}
                        className="bg-white rounded-[28px] border border-slate-100 shadow-2xl w-full max-w-[1120px] max-h-[86vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        {/* Header */}
                        <div className="px-7 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 bg-slate-50/70">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-outfit">
                                    Kunden <span className="text-indigo-600 font-bold">auswählen</span>
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    Wählen Sie den gewünschten Kunden für dieses Dokument aus.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onAddNew();
                                    }}
                                    className="bg-primary-gradient text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-indigo-500/10 whitespace-nowrap"
                                >
                                    <Plus className="h-4 w-4" /> Neuen Kunden anlegen
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters Bar */}
                        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 bg-white">
                            {/* Search Input */}
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Suche nach Name, E-Mail, Kundennummer..."
                                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-800 text-sm"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                                    >
                                        <X className="h-4 w-4 text-slate-400" />
                                    </button>
                                )}
                            </div>

                            {/* Type Filters */}
                            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 self-start lg:self-auto shrink-0">
                                {[
                                    { id: 'all', label: 'Alle' },
                                    { id: 'private', label: 'Privat' },
                                    { id: 'business', label: 'Geschäftlich' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setFilterType(tab.id as any)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap",
                                            filterType === tab.id
                                                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/20"
                                                : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Selector */}
                            <div className="flex items-center gap-2 bg-slate-50 p-2 px-3 rounded-2xl border border-slate-100 shrink-0">
                                <ArrowUpDown className="h-4 w-4 text-slate-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 outline-none cursor-pointer"
                                >
                                    <option value="name">Name (A-Z)</option>
                                    <option value="number">Kundennummer</option>
                                    <option value="recent">Zuletzt erstellt</option>
                                </select>
                            </div>
                        </div>

                        {/* Customer List Content */}
                        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/60 space-y-3 max-h-[58vh] min-h-[320px]">
                            {processedCustomers.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {processedCustomers.map((customer) => {
                                        const isSelected = selectedId === customer.id;
                                        const info = typeLabels[customer.type] || typeLabels.private;
                                        return (
                                            <div
                                                key={customer.id}
                                                onClick={() => {
                                                    onSelect(customer.id);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }}
                                                className={cn(
                                                    "bg-white border p-4 rounded-2xl grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(170px,0.75fr)_minmax(210px,0.9fr)_32px] lg:items-center gap-4 hover:border-indigo-500/50 hover:shadow-md transition-all duration-300 cursor-pointer group relative",
                                                    isSelected ? "border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/10" : "border-slate-100"
                                                )}
                                            >
                                                {/* Left: Avatar & Name */}
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={cn(
                                                        "h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 transition-all group-hover:scale-105",
                                                        customer.type === 'business' 
                                                            ? "bg-emerald-50 border-emerald-100 text-emerald-500" 
                                                            : "bg-purple-50 border-purple-100 text-purple-500"
                                                    )}>
                                                        {customer.type === 'business' ? <Briefcase className="h-5.5 w-5.5" /> : <User className="h-5.5 w-5.5" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-extrabold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors truncate">
                                                            {customer.name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className={cn(
                                                                "text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-[0.1em]",
                                                                info.color
                                                            )}>
                                                                {info.label}
                                                            </span>
                                                            {customer.customer_number && (
                                                                <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50 uppercase tracking-[0.05em] flex items-center gap-0.5">
                                                                    <Hash className="h-2 w-2" /> {customer.customer_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle: Contacts */}
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    {customer.email && (
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            <span className="truncate">{customer.email}</span>
                                                        </div>
                                                    )}
                                                    {customer.phone && (
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            <span>{customer.phone}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Address */}
                                                <div className="flex items-center gap-2 min-w-0 text-xs font-semibold text-slate-500">
                                                    {(customer.address?.street || customer.address?.city) ? (
                                                        <>
                                                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            <span className="truncate">
                                                                {[customer.address.street, customer.address.zip, customer.address.city].filter(Boolean).join(", ")}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-350 italic">Keine Adresse</span>
                                                    )}
                                                </div>

                                                {/* Selected indicator checkmark */}
                                                <div className="flex items-center justify-end w-8 shrink-0">
                                                    {isSelected && (
                                                        <div className="h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow shadow-indigo-500/30">
                                                            <Check className="h-4 w-4 stroke-[3]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-slate-100">
                                    <Search className="h-12 w-12 text-slate-200 mb-3" />
                                    <h4 className="text-lg font-bold text-slate-800">Keine Kunden gefunden</h4>
                                    <p className="text-slate-400 text-sm mt-1">Ändern Sie Ihre Suchkriterien oder legen Sie einen neuen Kunden an.</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer Summary */}
                        <div className="px-7 py-4 border-t border-slate-100 bg-white flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <span>Verfügbare Kunden: {selectableCustomers.length}</span>
                            <span>Gefiltert: {processedCustomers.length}</span>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
}
