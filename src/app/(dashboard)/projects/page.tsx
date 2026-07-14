"use client";

import React, { useState } from "react";
import { Plus, BriefcaseBusiness } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { useOffers } from "@/hooks/useOffers";
import { useOrders } from "@/hooks/useOrders";
import { Project } from "@/types/project";
import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { ProjectDetails } from "@/components/projects/ProjectDetails";
import { useRouter } from "next/navigation";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

export default function ProjectsPage() {
    usePermissionGuard("projects_read");
    const router = useRouter();
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { customers, addCustomer } = useCustomers();
    const { invoices } = useInvoices();
    const { offers } = useOffers();
    const { orders } = useOrders();

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [activeView, setActiveView] = useState<'list' | 'details'>('list');
    const [viewProjectId, setViewProjectId] = useState<string | null>(null);

    const activeProject = projects.find(p => p.id === viewProjectId);

    const handleCreateProject = (project: Project) => {
        if (selectedProject) {
            updateProject(selectedProject.id, project);
        } else {
            addProject(project);
        }
        setSelectedProject(null);
    };

    const handleEditProject = (project: Project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handleViewProject = (project: Project) => {
        setViewProjectId(project.id);
        setActiveView('details');
    };

    const handleBackToList = () => {
        setViewProjectId(null);
        setActiveView('list');
    };

    // Redirect to invoice creation with project context
    const handleCreateInvoice = (type: 'partial' | 'final') => {
        if (!activeProject) return;

        // Find next partial number if needed
        const projectInvoices = invoices.filter(inv => inv.projectId === activeProject.id);
        const nextPartial = type === 'partial' ? projectInvoices.filter(inv => inv.billingType === 'partial').length + 1 : undefined;

        // Encode params
        const params = new URLSearchParams({
            projectId: activeProject.id,
            customerId: activeProject.customerId,
            billingType: type,
            ...(nextPartial && { partialNumber: nextPartial.toString() })
        });

        router.push(`/invoices/new?${params.toString()}`);
    };

    return (
        <div className="dashboard-page">
            {activeView === 'list' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
                        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                            <div>
                                <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
                                    <BriefcaseBusiness className="h-5 w-5 text-cyan-100" />
                                    <span className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">Ausführung</span>
                                </div>
                                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Projekte</h1>
                                <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-white/70">
                                Verwalten Sie Ihre Baustellen und behalten Sie den Überblick über Fortschritt und Abrechnungen.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedProject(null);
                                    setIsModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-xl shadow-indigo-950/20 transition hover:scale-[1.02] active:scale-95"
                            >
                                <Plus className="h-5 w-5" /> Neues Projekt
                            </button>
                        </div>
                    </section>

                    <ProjectList
                        projects={projects}
                        customers={customers}
                        onEdit={handleEditProject}
                        onDelete={deleteProject}
                        onView={handleViewProject}
                    />
                </div>
            )}

            {activeView === 'details' && activeProject && (
                <ProjectDetails
                    project={activeProject}
                    customer={customers.find(c => c.id === activeProject.customerId)}
                    invoices={invoices}
                    offers={offers}
                    orders={orders}
                    onBack={handleBackToList}
                    onEdit={() => handleEditProject(activeProject)}
                    onCreateInvoice={handleCreateInvoice}
                />
            )}

            <ProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCreateProject}
                onAddCustomer={addCustomer}
                customers={customers}
                initialProject={selectedProject || undefined}
            />
        </div>
    );
}
