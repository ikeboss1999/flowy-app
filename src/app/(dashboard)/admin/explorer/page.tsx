"use client";

import { useEffect, useState } from "react";
import {
    Search,
    ChevronLeft,
    Database,
    Filter,
    Edit3,
    Trash2,
    CheckCircle2,
    XCircle,
    Copy,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABLES = [
    { id: 'invoices', label: 'Rechnungen' },
    { id: 'customers', label: 'Kunden' },
    { id: 'projects', label: 'Projekte' },
    { id: 'employees', label: 'Mitarbeiter' },
    { id: 'vehicles', label: 'Fahrzeuge' },
    { id: 'services', label: 'Leistungen' },
    { id: 'todos', label: 'To-Dos' },
];

export default function GlobalExplorer() {
    const [selectedTable, setSelectedTable] = useState(TABLES[0].id);
    const [data, setData] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingRecord, setEditingRecord] = useState<any>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const res = await fetch("/api/admin/users");
            if (res.ok) setUsers(await res.json());
        };
        fetchUsers();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const url = `/api/admin/data/${selectedTable}${selectedUserId ? `?userId=${selectedUserId}` : ''}`;
            const res = await fetch(url);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error("Failed to fetch global data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedTable, selectedUserId]);

    const handleSave = async (record: any) => {
        try {
            const res = await fetch(`/api/admin/data/${selectedTable}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(record)
            });
            if (res.ok) {
                setEditingRecord(null);
                fetchData();
            }
        } catch (err) {
            alert("Fehler beim Speichern");
        }
    };

    const handleDelete = async (id: string, userId: string) => {
        if (!confirm("Diesen Datensatz wirklich global löschen?")) return;
        try {
            const res = await fetch(`/api/admin/data/${selectedTable}?id=${id}&userId=${userId}`, {
                method: "DELETE"
            });
            if (res.ok) fetchData();
        } catch (err) {
            alert("Fehler beim Löschen");
        }
    };

    const filteredData = data.filter(item => {
        const str = JSON.stringify(item).toLowerCase();
        return str.includes(searchTerm.toLowerCase());
    });

    const getUserEmail = (userId: string) => {
        return users.find(u => u.id === userId)?.email || userId;
    };

    return (
        <div className="p-12 space-y-12">
            <header className="flex justify-between items-center">
                <div className="space-y-2">
                    <Link href="/admin" className="text-slate-400 flex items-center gap-2 hover:text-indigo-600 transition-colors font-bold mb-2">
                        <ChevronLeft className="h-4 w-4" /> Zurück zum Dashboard
                    </Link>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit flex items-center gap-4">
                        <Database className="h-10 w-10 text-indigo-600" /> Global Explorer
                    </h1>
                </div>

                <div className="flex gap-4">
                    <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none"
                    >
                        {TABLES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>

                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none"
                    >
                        <option value="">Alle Benutzer</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                    </select>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Daten durchsuchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 w-64 focus:ring-2 ring-indigo-500/20 outline-none transition-all font-medium"
                        />
                    </div>
                </div>
            </header>

            <section className="glass-card p-0 overflow-hidden">
                <div className="max-h-[600px] overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Besitzer</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">UUID / Name</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Details</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{getUserEmail(item.userId)}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{item.userId}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 uppercase tracking-tight">{item.name || item.invoiceNumber || item.title || item.employeeNumber || 'UNNAMED'}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="max-w-xs truncate text-sm text-slate-500 italic">
                                            {JSON.stringify(item)}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingRecord(item)}
                                                className="p-3 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all"
                                                title="Über Bearbeiten"
                                            >
                                                <Edit3 className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id, item.userId)}
                                                className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all"
                                                title="Löschen"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Editing Modal - Crude but Effective for Admin */}
            {editingRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-12">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">Datensatz bearbeiten</h3>
                                <p className="text-sm text-slate-500">Globaler Edit für {selectedTable}</p>
                            </div>
                            <button onClick={() => setEditingRecord(null)} className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all">
                                <XCircle className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 overflow-auto custom-scrollbar flex-1 bg-slate-50/50">
                            <div className="grid grid-cols-1 gap-6">
                                {Object.keys(editingRecord).map(key => (
                                    <div key={key} className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">{key}</label>
                                        {typeof editingRecord[key] === 'object' ? (
                                            <textarea
                                                value={JSON.stringify(editingRecord[key], null, 2)}
                                                onChange={(e) => {
                                                    try {
                                                        const val = JSON.parse(e.target.value);
                                                        setEditingRecord({ ...editingRecord, [key]: val });
                                                    } catch (err) { }
                                                }}
                                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-mono text-sm focus:ring-2 ring-indigo-500/20 outline-none h-32"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={editingRecord[key]}
                                                onChange={(e) => setEditingRecord({ ...editingRecord, [key]: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 font-medium focus:ring-2 ring-indigo-500/20 outline-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 flex justify-end gap-4">
                            <button onClick={() => setEditingRecord(null)} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Abbrechen</button>
                            <button onClick={() => handleSave(editingRecord)} className="bg-primary-gradient text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all">Änderungen speichern</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
