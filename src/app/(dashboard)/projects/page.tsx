"use client";

import React, { useState } from "react";
import { Plus, FolderOpen, ArrowRight } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { Project } from "@/types/project";
import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { ProjectDetails } from "@/components/projects/ProjectDetails";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
    const router = useRouter();
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { customers, addCustomer } = useCustomers();
    const { invoices } = useInvoices();

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
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen pb-32">
            {activeView === 'list' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Projekte</h1>
                            <p className="text-lg text-slate-500 font-medium max-w-2xl">
                                Verwalten Sie Ihre Baustellen und behalten Sie den Überblick über Fortschritt und Abrechnungen.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedProject(null);
                                setIsModalOpen(true);
                            }}
                            className="bg-primary-gradient text-white px-8 py-4 rounded-[20px] font-bold shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <Plus className="h-5 w-5" /> Neues Projekt
                        </button>
                    </div>

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
