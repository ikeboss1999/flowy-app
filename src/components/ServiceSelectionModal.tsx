
import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Book } from 'lucide-react';
import { Service } from '@/types/service';

interface ServiceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (service: Service) => void;
    services: Service[];
    onCreateNew: () => void;
}

export function ServiceSelectionModal({ isOpen, onClose, onSelect, services, onCreateNew }: ServiceSelectionModalProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredServices = useMemo(() => {
        return services.filter(s =>
            s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [services, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Book className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Leistung auswählen</h3>
                            <p className="text-sm text-slate-500 font-medium">Wählen Sie eine Vorlage aus der Liste</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium placeholder:text-slate-400"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredServices.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="inline-flex h-16 w-16 rounded-full bg-slate-50 items-center justify-center mb-4">
                                <Search className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium">Keine Leistungen gefunden</p>
                        </div>
                    ) : (
                        filteredServices.map(service => (
                            <button
                                key={service.id}
                                onClick={() => onSelect(service)}
                                className="w-full text-left p-4 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-100 border border-transparent transition-all group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-800 group-hover:text-indigo-900">{service.title}</span>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold whitespace-nowrap group-hover:bg-indigo-100 group-hover:text-indigo-700">
                                        € {service.price.toFixed(2)} / {service.unit}
                                    </span>
                                </div>
                                {service.description && (
                                    <p className="text-sm text-slate-500 line-clamp-2 group-hover:text-slate-600">{service.description}</p>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {filteredServices.length} {filteredServices.length === 1 ? 'Eintrag' : 'Einträge'}
                    </span>
                    <button
                        onClick={onCreateNew}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Neue Leistung erstellen
                    </button>
                </div>
            </div>
        </div>
    );
}
