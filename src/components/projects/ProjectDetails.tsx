"use client";

import React, { useMemo, useState } from "react";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Building,
    Banknote,
    FileText,
    Plus,
    CheckCircle,
    Clock,
    ListChecks,
    ArrowRight
} from "lucide-react";
import { Project, ProjectStatus, PaymentPlanItem } from "@/types/project";
import { Customer } from "@/types/customer";
import { Invoice } from "@/types/invoice";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { PaymentPlanModal } from "./PaymentPlanModal";

interface ProjectDetailsProps {
    project: Project;
    customer?: Customer;
    invoices: Invoice[];
    onBack: () => void;
    onEdit: () => void;
    onCreateInvoice: (type: 'partial' | 'final') => void;
}

export function ProjectDetails({ project, customer, invoices, onBack, onEdit, onCreateInvoice }: ProjectDetailsProps) {
    const router = useRouter();
    const { updateProject } = useProjects();
    const [isPaymentPlanModalOpen, setIsPaymentPlanModalOpen] = useState(false);

    // Calculate financials
    const financials = useMemo(() => {
        const projectInvoices = invoices
            .filter(inv => inv.projectId === project.id && inv.status !== 'canceled')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const totalBilled = projectInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
        const totalNet = projectInvoices.reduce((acc, inv) => acc + inv.subtotal, 0);
        const totalPaid = projectInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((acc, inv) => acc + inv.totalAmount, 0);

        // Find partial invoices
        const partialInvoices = projectInvoices.filter(inv => inv.billingType === 'partial');
        const finalInvoice = projectInvoices.find(inv => inv.billingType === 'final');

        const budget = project.budget || 0;
        const openAmount = Math.max(0, budget - totalPaid);

        return {
            totalBilled,
            totalNet,
            totalPaid,
            budget,
            openAmount,
            invoiceCount: projectInvoices.length,
            partialCount: partialInvoices.length,
            hasFinalInvoice: !!finalInvoice,
            invoices: projectInvoices
        };
    }, [invoices, project.id, project.budget]);

    const handleSavePaymentPlan = (plan: PaymentPlanItem[]) => {
        updateProject(project.id, { paymentPlan: plan });
    };

    const handleCreateInvoiceFromPlan = (item: PaymentPlanItem) => {
        // Find index for the partial number
        const index = project.paymentPlan?.findIndex(p => p.id === item.id) ?? -1;
        const partialNumber = index !== -1 ? index + 1 : undefined;

        // Determine billing type based on name or order? 
        // Simple logic: if name contains "Schluss", it's final, otherwise partial.
        const type = item.name.toLowerCase().includes('schluss') ? 'final' : 'partial';

        const params = new URLSearchParams({
            projectId: project.id,
            customerId: project.customerId,
            billingType: type,
            amount: item.amount.toString(),
            subjectExtra: item.description || item.name,
            partialNumber: partialNumber?.toString() || ""
        });

        router.push(`/invoices/new?${params.toString()}`);
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

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-medium"
                >
                    <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={onEdit}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Bearbeiten
                    </button>
                    {!financials.hasFinalInvoice && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onCreateInvoice('partial')}
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> Teilrechnung
                            </button>
                            <button
                                onClick={() => onCreateInvoice('final')}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2"
                            >
                                <CheckCircle className="h-4 w-4" /> Schlussrechnung
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Title Card */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusStyle(project.status))}>
                                {getStatusLabel(project.status)}
                            </span>
                            <span className="text-slate-400 text-sm font-medium flex items-center gap-1">
                                <Calendar className="h-4 w-4" /> Erstellt: {new Date(project.createdAt).toLocaleDateString('de-DE')}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                        <div className="flex flex-wrap gap-6 text-slate-500 font-medium">
                            {customer && (
                                <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-slate-400" />
                                    {customer.name}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                {project.address.street}, {project.address.zip} {project.address.city}
                            </div>
                        </div>
                        {project.description && (
                            <p className="text-slate-600 max-w-2xl leading-relaxed">{project.description}</p>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4">
                        <div className="bg-slate-50 rounded-2xl p-5 min-w-[160px] border border-slate-100">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Projekt Summe (Netto)</p>
                            <p className="text-2xl font-black text-slate-900">€ {financials.budget.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl p-5 min-w-[160px] border border-emerald-100">
                            <p className="text-emerald-600/70 text-xs font-bold uppercase tracking-widest mb-1">Bereits bezahlt</p>
                            <p className="text-2xl font-black text-emerald-700">€ {financials.totalPaid.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-2xl p-5 min-w-[160px] border border-indigo-100">
                            <p className="text-indigo-600/70 text-xs font-bold uppercase tracking-widest mb-1">Offen</p>
                            <p className="text-2xl font-black text-indigo-700">€ {financials.openAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Plan Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-indigo-600" />
                        Zahlungsplan
                    </h3>
                    <button
                        onClick={() => setIsPaymentPlanModalOpen(true)}
                        className="text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors text-sm"
                    >
                        Plan bearbeiten
                    </button>
                </div>

                {!project.paymentPlan || project.paymentPlan.length === 0 ? (
                    <div className="bg-slate-50 rounded-[24px] border border-slate-100 p-8 text-center border-dashed">
                        <p className="text-slate-500 font-medium mb-4">Noch kein Zahlungsplan hinterlegt.</p>
                        <button
                            onClick={() => setIsPaymentPlanModalOpen(true)}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm inline-flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" /> Zahlungsplan erstellen
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-16">Nr.</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Bezeichnung</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fällig am</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Betrag (Netto)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                    <th className="px-6 py-4 w-40"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {project.paymentPlan.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-400">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{item.name}</div>
                                            {item.description && (
                                                <div className="text-xs text-slate-400 mt-0.5 font-medium">{item.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString('de-DE') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                            € {item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.invoiceId ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Erstellt
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                                    Geplant
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!item.invoiceId && (
                                                <button
                                                    onClick={() => handleCreateInvoiceFromPlan(item)}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1 ml-auto"
                                                >
                                                    Rechnung erstellen <ArrowRight className="h-3 w-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invoices List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 px-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Projektrechnungen
                </h3>

                {financials.invoices.length === 0 ? (
                    <div className="bg-slate-50 rounded-[24px] border border-slate-100 p-12 text-center">
                        <p className="text-slate-500 font-medium">Noch keine Rechnungen für dieses Projekt erstellt.</p>
                        <button
                            onClick={() => onCreateInvoice('partial')}
                            className="mt-4 text-indigo-600 font-bold hover:underline"
                        >
                            Erste Teilrechnung erstellen
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nr.</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Typ</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Datum</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Betrag (Netto)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {financials.invoices.map((inv) => (
                                    <tr
                                        key={inv.id}
                                        onClick={() => router.push('/dashboard')} // Ideally open functionality
                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-md text-xs font-bold uppercase",
                                                inv.billingType === 'final' ? "bg-emerald-100 text-emerald-700" :
                                                    inv.billingType === 'partial' ? "bg-indigo-100 text-indigo-700" :
                                                        "bg-slate-100 text-slate-700"
                                            )}>
                                                {inv.billingType === 'final' ? 'Schlussrechnung' :
                                                    inv.billingType === 'partial' ? `${inv.partialPaymentNumber}. Teilrechnung` : 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(inv.issueDate).toLocaleDateString('de-DE')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                            € {inv.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                inv.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                                                    inv.status === 'pending' ? "bg-amber-50 text-amber-600" :
                                                        inv.status === 'overdue' ? "bg-rose-50 text-rose-600" :
                                                            "bg-slate-100 text-slate-500"
                                            )}>
                                                {inv.status === 'paid' ? 'Bezahlt' :
                                                    inv.status === 'pending' ? 'Offen' :
                                                        inv.status === 'overdue' ? 'Überfällig' : inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <PaymentPlanModal
                isOpen={isPaymentPlanModalOpen}
                onClose={() => setIsPaymentPlanModalOpen(false)}
                project={project}
                onSave={handleSavePaymentPlan}
            />
        </div>
    );
}
