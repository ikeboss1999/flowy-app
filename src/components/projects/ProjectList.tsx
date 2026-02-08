"use client";

import React, { useState } from "react";

import {
    MoreHorizontal,
    Edit2,
    Trash2,
    ExternalLink,
    MapPin,
    Calendar,
    Briefcase
} from "lucide-react";
import { Project, ProjectStatus } from "@/types/project";
import { Customer } from "@/types/customer";
import { cn } from "@/lib/utils";

interface ProjectListProps {
    projects: Project[];
    customers: Customer[];
    onEdit: (project: Project) => void;
    onDelete: (id: string) => void;
    onView: (project: Project) => void;
}

export function ProjectList({ projects, customers, onEdit, onDelete, onView }: ProjectListProps) {
    const getCustomerName = (id: string) => {
        const customer = customers.find(c => c.id === id);
        return customer ? customer.name : "Unbekannter Kunde";
    };

    const getStatusStyle = (status: ProjectStatus) => {
        switch (status) {
            case "active": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "completed": return "bg-slate-50 text-slate-600 border-slate-100";
            case "planned": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            case "on_hold": return "bg-amber-50 text-amber-600 border-amber-100";
            default: return "bg-slate-50 text-slate-600";
        }
    };

    const getStatusLabel = (status: ProjectStatus) => {
        switch (status) {
            case "active": return "Laufend";
            case "completed": return "Abgeschlossen";
            case "planned": return "Geplant";
            case "on_hold": return "Pausiert";
            default: return status;
        }
    };

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-slate-100 shadow-sm text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Briefcase className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Keine Projekte gefunden</h3>
                <p className="text-slate-500 max-w-sm">
                    Legen Sie Ihr erstes Projekt an, um Baustellen zu verwalten und Abrechnungen zu erstellen.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Projekt</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Kunde</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Standort</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Erstellt am</th>
                            <th className="px-8 py-5 w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {projects.map((project) => (
                            <tr key={project.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-5">
                                    <div className="font-bold text-slate-900">{project.name}</div>
                                    {project.description && (
                                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">{project.description}</div>
                                    )}
                                </td>
                                <td className="px-8 py-5 font-medium text-slate-700">
                                    {getCustomerName(project.customerId)}
                                </td>
                                <td className="px-8 py-5">
                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusStyle(project.status))}>
                                        {getStatusLabel(project.status)}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                        {project.address.city}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-sm font-mono text-slate-500">
                                    {new Date(project.createdAt).toLocaleDateString('de-DE')}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3 justify-end">
                                        <button
                                            onClick={() => onView(project)}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100/50 shadow-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Öffnen
                                        </button>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => onEdit(project)}
                                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                title="Bearbeiten"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(project.id)}
                                                className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                                title="Löschen"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
