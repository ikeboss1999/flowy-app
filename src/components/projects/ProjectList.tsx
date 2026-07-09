"use client";

import React, { useMemo, useState } from "react";
import {
    Briefcase,
    Calendar,
    CheckCircle2,
    CirclePause,
    Clock3,
    Edit2,
    MapPin,
    Search,
    Trash2,
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

const STATUS_OPTIONS: Array<{ id: ProjectStatus | "all"; label: string }> = [
    { id: "all", label: "Alle" },
    { id: "active", label: "Laufend" },
    { id: "planned", label: "Geplant" },
    { id: "on_hold", label: "Pausiert" },
    { id: "completed", label: "Abgeschlossen" },
];

export function ProjectList({ projects, customers, onEdit, onDelete, onView }: ProjectListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

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
            default: return "bg-slate-50 text-slate-600 border-slate-100";
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

    const stats = useMemo(() => ({
        all: projects.length,
        active: projects.filter(project => project.status === "active").length,
        planned: projects.filter(project => project.status === "planned").length,
        on_hold: projects.filter(project => project.status === "on_hold").length,
        completed: projects.filter(project => project.status === "completed").length,
    }), [projects]);

    const filteredProjects = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return projects.filter(project => {
            const customerName = getCustomerName(project.customerId);
            const matchesStatus = statusFilter === "all" || project.status === statusFilter;
            const matchesSearch =
                !query ||
                project.name.toLowerCase().includes(query) ||
                customerName.toLowerCase().includes(query) ||
                (project.projectNumber || "").toLowerCase().includes(query) ||
                (project.address.city || "").toLowerCase().includes(query) ||
                (project.description || "").toLowerCase().includes(query);

            return matchesStatus && matchesSearch;
        });
    }, [projects, searchQuery, statusFilter, customers]);

    const statCards = [
        { id: "active" as const, label: "Laufend", value: stats.active, icon: Briefcase, className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
        { id: "planned" as const, label: "Geplant", value: stats.planned, icon: Clock3, className: "bg-indigo-50 text-indigo-700 border-indigo-100" },
        { id: "on_hold" as const, label: "Pausiert", value: stats.on_hold, icon: CirclePause, className: "bg-amber-50 text-amber-700 border-amber-100" },
        { id: "completed" as const, label: "Abgeschlossen", value: stats.completed, icon: CheckCircle2, className: "bg-slate-50 text-slate-700 border-slate-100" },
    ];

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500">
                    <Briefcase className="h-10 w-10" />
                </div>
                <h3 className="mb-2 text-xl font-black text-slate-900">Keine Projekte gefunden</h3>
                <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500">
                    Legen Sie Ihr erstes Projekt an, um Baustellen, Abrechnungen, Dateien und Bautagebuch zentral zu verwalten.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map(({ id, label, value, icon: Icon, className }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === id ? "all" : id)}
                        className={cn(
                            "rounded-[24px] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                            className,
                            statusFilter === id && "ring-2 ring-indigo-200"
                        )}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest opacity-70">{label}</p>
                                <p className="mt-2 text-3xl font-black">{value}</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70">
                                <Icon className="h-6 w-6" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="rounded-[32px] border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Projekt, Kunde, Ort oder Projektnummer suchen..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {STATUS_OPTIONS.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setStatusFilter(option.id)}
                                className={cn(
                                    "shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition-all",
                                    statusFilter === option.id
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredProjects.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center">
                        <Briefcase className="mb-4 h-10 w-10 text-slate-300" />
                        <h3 className="text-lg font-black text-slate-900">Keine passenden Projekte</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">Passen Sie Suche oder Statusfilter an.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[24px] border border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-100 bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Projekt</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Kunde</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Standort</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Erstellt am</th>
                                        <th className="px-6 py-4 w-24"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProjects.map((project) => (
                                        <tr
                                            key={project.id}
                                            onClick={() => onView(project)}
                                            className="group cursor-pointer transition-all hover:bg-slate-50/80"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="font-black text-slate-900 transition-colors group-hover:text-indigo-600">{project.name}</div>
                                                {project.projectNumber && (
                                                    <div className="mt-1 text-xs font-bold text-indigo-500">{project.projectNumber}</div>
                                                )}
                                                {project.description && (
                                                    <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-400">{project.description}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 font-bold text-slate-700">
                                                {getCustomerName(project.customerId)}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider", getStatusStyle(project.status))}>
                                                    {getStatusLabel(project.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-semibold text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                    {project.address.city || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-semibold text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    {new Date(project.createdAt).toLocaleDateString("de-DE")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onEdit(project);
                                                        }}
                                                        className="rounded-xl border border-transparent p-2.5 text-slate-400 transition-all hover:border-slate-100 hover:bg-white hover:text-indigo-600 hover:shadow-md"
                                                        title="Bearbeiten"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onDelete(project.id);
                                                        }}
                                                        className="rounded-xl border border-transparent p-2.5 text-slate-400 transition-all hover:border-rose-100 hover:bg-white hover:text-rose-600 hover:shadow-md"
                                                        title="Loeschen"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
