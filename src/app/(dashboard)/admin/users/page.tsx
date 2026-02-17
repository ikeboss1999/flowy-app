"use client";

import { useEffect, useState } from "react";
import {
    Users,
    Shield,
    User,
    Trash2,
    Search,
    ChevronLeft,
    ShieldAlert,
    MoreVertical
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole })
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            console.error("Role update failed", err);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Bist du sicher, dass du diesen Benutzer unwiderruflich löschen möchtest? Alle zugehörigen Daten gehen verloren.")) return;

        try {
            const res = await fetch(`/api/admin/users?userId=${userId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-12 animate-pulse space-y-8"><div className="h-12 w-64 bg-slate-200 rounded-xl" /></div>;
    }

    return (
        <div className="p-12 space-y-12">
            <header className="flex justify-between items-center">
                <div className="space-y-2">
                    <Link href="/admin" className="text-slate-400 flex items-center gap-2 hover:text-indigo-600 transition-colors font-bold mb-2">
                        <ChevronLeft className="h-4 w-4" /> Zurück zum Dashboard
                    </Link>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit flex items-center gap-4">
                        Benutzerverwaltung
                    </h1>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Nutzer suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 w-80 focus:ring-2 ring-indigo-500/20 outline-none transition-all font-medium"
                    />
                </div>
            </header>

            <section className="glass-card overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Benutzer</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Rolle</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Erstellt am</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg",
                                            user.role === 'admin' ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {user.name?.charAt(0) || user.email.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 leading-none mb-1">{user.name || 'Ohne Name'}</p>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className={cn(
                                            "bg-transparent font-bold text-sm outline-none cursor-pointer p-1 rounded transition-colors",
                                            user.role === 'admin' ? "text-indigo-600 hover:bg-indigo-50" : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        <option value="user">Benutzer</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                        user.isVerified
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            : "bg-amber-50 text-amber-600 border-amber-100"
                                    )}>
                                        {user.isVerified ? 'Verifiziert' : 'Pending'}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-sm font-medium text-slate-500">
                                    {new Date(user.createdAt).toLocaleDateString('de-DE')}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/admin/explorer?userId=${user.id}`}
                                            className="p-3 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all"
                                            title="Daten dieses Nutzers ansehen"
                                        >
                                            <Search className="h-5 w-5" />
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
                                            title="Benutzer löschen"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
