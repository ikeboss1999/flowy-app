"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserCircle, Users, ArrowRight, Clock } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";

export default function TimeTrackingPage() {
    const router = useRouter();
    const { employees, isLoading } = useEmployees();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredEmployees = employees.filter((emp) => {
        // emp.personalData is already an object from the API/Hook
        const fullName = `${emp.personalData.firstName} ${emp.personalData.lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Zeiterfassung</h1>
                    <p className="text-slate-500 font-medium">Wählen Sie einen Mitarbeiter aus, um Zeiten zu erfassen.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Clock className="h-64 w-64 text-indigo-900" />
                </div>

                <div className="relative z-10 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-8 max-w-xl">
                    <Search className="h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Mitarbeiter suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-slate-900 font-medium placeholder:text-slate-400"
                    />
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-slate-400 italic">Lade Mitarbeiter...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Keine Mitarbeiter gefunden.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredEmployees.map((emp) => {
                            const name = `${emp.personalData.firstName} ${emp.personalData.lastName}`;
                            const position = emp.employment.position || "Mitarbeiter";

                            return (
                                <button
                                    key={emp.id}
                                    onClick={() => router.push(`/time-tracking/${emp.id}`)}
                                    className="group flex items-center gap-4 p-5 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                                >
                                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
                                        {emp.avatar ? (
                                            <img src={emp.avatar} alt={name} className="h-full w-full object-cover" />
                                        ) : (
                                            <UserCircle className="h-8 w-8 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-900">{name}</h3>
                                        <p className="text-sm text-slate-500 truncate">{position}</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
