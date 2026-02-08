"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, User, Building2, Check, ChevronDown, Plus, X } from 'lucide-react';
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
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedCustomer = useMemo(() =>
        customers.find(c => c.id === selectedId),
        [customers, selectedId]);

    const filteredCustomers = useMemo(() => {
        if (!search) return customers;
        const lowSearch = search.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(lowSearch) ||
            c.email.toLowerCase().includes(lowSearch) ||
            (c.type === 'business' && c.name.toLowerCase().includes(lowSearch))
        );
    }, [customers, search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const typeLabels = {
        private: { label: 'Privat', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: User },
        business: { label: 'Geschäftlich', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: Building2 }
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-left transition-all hover:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10",
                    isOpen && "border-indigo-500 ring-4 ring-indigo-500/10"
                )}
            >
                {selectedCustomer ? (
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center border",
                            selectedCustomer.type === 'business' ? "bg-purple-50 border-purple-100 text-purple-500" : "bg-blue-50 border-blue-100 text-blue-500"
                        )}>
                            {selectedCustomer.type === 'business' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </div>
                        <div>
                            <div className="text-slate-900 font-bold leading-tight">{selectedCustomer.name}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {typeLabels[selectedCustomer.type].label}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400 font-medium">{placeholder}</span>
                )}
                <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-[100] mt-3 w-full bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                    {/* Search Input */}
                    <div className="p-4 border-b border-slate-50 relative">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Suchen nach Name, Email..."
                            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium text-slate-900 outline-none"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="h-3 w-3 text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* Customer List */}
                    <div className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(customer => {
                                const info = typeLabels[customer.type] || typeLabels.private;
                                return (
                                    <button
                                        key={customer.id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(customer.id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={cn(
                                            "w-full p-4 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all group",
                                            selectedId === customer.id && "bg-indigo-50/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-xl flex items-center justify-center border transition-colors",
                                                customer.type === 'business'
                                                    ? "bg-purple-50 border-purple-100 text-purple-500 group-hover:bg-purple-100"
                                                    : "bg-blue-50 border-blue-100 text-blue-500 group-hover:bg-blue-100"
                                            )}>
                                                {customer.type === 'business' ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                                    {customer.name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn(
                                                        "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-[0.1em]",
                                                        info.color
                                                    )}>
                                                        {info.label}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">
                                                        {customer.address?.city || customer.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedId === customer.id && (
                                            <Check className="h-5 w-5 text-indigo-600" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center">
                                <Search className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold">Keine Kunden gefunden</p>
                            </div>
                        )}
                    </div>

                    {/* Footer / Add New */}
                    <div className="p-2 bg-slate-50 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                onAddNew();
                                setIsOpen(false);
                            }}
                            className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 bg-white border border-slate-200 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-95 shadow-sm"
                        >
                            <Plus className="h-4 w-4" /> Neuen Kunden anlegen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

