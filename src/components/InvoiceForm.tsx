"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Trash2,
    Save,
    CheckCircle2,
    Calendar,
    User,
    ChevronDown,
    PlusCircle,
    UserPlus,
    Calculator,
    LayoutDashboard,
    ArrowLeft,
    Book
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Invoice, InvoiceItem, InvoiceUnit, InvoiceStatus } from '@/types/invoice';
import { useCustomers } from '@/hooks/useCustomers';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useInvoices } from '@/hooks/useInvoices';
import { useServices } from '@/hooks/useServices';
import { useProjects } from '@/hooks/useProjects';
import { useRouter, useSearchParams } from 'next/navigation';
import { DatePicker } from '@/components/DatePicker';
import { CustomerModal } from '@/components/CustomerModal';
import { Customer } from '@/types/customer';
import { InvoicePDF } from '@/components/InvoicePDF';
import { InvoicePrintHandler } from '@/components/InvoicePrintHandler';
import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { ServiceSelectionModal } from '@/components/ServiceSelectionModal';
import { ServiceModal } from '@/components/ServiceModal';
import { Service } from '@/types/service';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';

interface InvoiceFormProps {
    initialData?: Partial<Invoice>;
}

export function InvoiceForm({ initialData }: InvoiceFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { customers, isLoading: isCustomersLoading, addCustomer } = useCustomers();
    const { data: settings, updateData: updateSettings, isLoading: isSettingsLoading } = useInvoiceSettings();
    const { data: companySettings, isLoading: isCompanyLoading } = useCompanySettings();
    const { addInvoice, updateInvoice, invoices, isLoading: isInvoicesLoading } = useInvoices();
    const { services, addService } = useServices();
    const { projects, isLoading: isProjectsLoading } = useProjects();

    // Diagnostic logging for loading states
    useEffect(() => {
        if (isCustomersLoading || isSettingsLoading || isCompanyLoading || isProjectsLoading) {
            console.log('InvoiceForm Loading States:', {
                customers: isCustomersLoading,
                settings: isSettingsLoading,
                company: isCompanyLoading,
                projects: isProjectsLoading
            });
        } else {
            console.log('InvoiceForm Loading Complete');
        }
    }, [isCustomersLoading, isSettingsLoading, isCompanyLoading, isProjectsLoading]);


    // UI/Modal State
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [activeServiceItemId, setActiveServiceItemId] = useState<string | null>(null);
    const [savingStatus, setSavingStatus] = useState<InvoiceStatus | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
    const [subjectExtra, setSubjectExtra] = useState(initialData?.subjectExtra || '');
    const [constructionProject, setConstructionProject] = useState(initialData?.constructionProject || '');
    const [issueDate, setIssueDate] = useState(initialData?.issueDate || new Date().toISOString().split('T')[0]);
    const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms || '');
    const [perfFrom, setPerfFrom] = useState(initialData?.performancePeriod?.from || '');
    const [perfTo, setPerfTo] = useState(initialData?.performancePeriod?.to || '');
    const [customerId, setCustomerId] = useState(initialData?.customerId || '');
    const [projectId, setProjectId] = useState(initialData?.projectId || '');
    const [billingType, setBillingType] = useState<'standard' | 'partial' | 'final'>(initialData?.billingType || 'standard');
    const [partialPaymentNumber, setPartialPaymentNumber] = useState<number | undefined>(initialData?.partialPaymentNumber);
    const [paymentPlanItemId, setPaymentPlanItemId] = useState<string | undefined>(initialData?.paymentPlanItemId);
    const [processor, setProcessor] = useState(initialData?.processor || '');

    // Set default processor from company settings
    useEffect(() => {
        if (!initialData && !isCompanyLoading && companySettings) {
            setProcessor(prev => {
                if (prev) return prev;
                return `${companySettings.ceoFirstName} ${companySettings.ceoLastName}`.trim();
            });
        }
    }, [isCompanyLoading, companySettings, initialData]);

    const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || [
        { id: '1', description: '', quantity: 1, unit: 'Stk', pricePerUnit: 0, totalPrice: 0 }
    ]);

    // Auto-apply customer-specific payment terms
    useEffect(() => {
        if (!customerId || isCustomersLoading || isSettingsLoading || initialData) return;

        const customer = customers.find(c => c.id === customerId);
        if (customer && customer.defaultPaymentTermId) {
            const customerTerm = settings.paymentTerms?.find(t => t.id === customer.defaultPaymentTermId);
            if (customerTerm) {
                setPaymentTerms(customerTerm.text);
            }
        }
    }, [customerId, customers, isCustomersLoading, settings, isSettingsLoading, initialData]);

    // Initialize from settings and params
    useEffect(() => {
        if (!isSettingsLoading && !initialData && settings) {
            setInvoiceNumber(`${new Date().getFullYear()}/${String(settings.nextInvoiceNumber || 1).padStart(2, '0')}`);
            const defaultTerm = settings.paymentTerms.find(t => t.id === settings.defaultPaymentTermId);
            if (defaultTerm) setPaymentTerms(defaultTerm.text);
        }

        // Prefill from URL Params
        if (!initialData && searchParams && !isProjectsLoading && !isCustomersLoading && !isInvoicesLoading) {
            const paramProjectId = searchParams.get('projectId');
            const paramCustomerId = searchParams.get('customerId');
            const paramBillingType = searchParams.get('billingType');
            const paramPartialNumber = searchParams.get('partialNumber');
            const paramPaymentPlanItemId = searchParams.get('paymentPlanItemId');
            const paramSubjectExtra = searchParams.get('subjectExtra');
            const paramAmount = searchParams.get('amount');

            if (paramProjectId) {
                setProjectId(paramProjectId);
                const proj = projects.find(p => p.id === paramProjectId);
                if (proj) {
                    setConstructionProject(`${proj.name} - ${proj.address.street}, ${proj.address.city}`);
                    if (!paramCustomerId) {
                        setCustomerId(proj.customerId);
                    }
                }
            }

            if (paramPaymentPlanItemId) setPaymentPlanItemId(paramPaymentPlanItemId);
            if (paramCustomerId) setCustomerId(paramCustomerId);
            if (paramBillingType) setBillingType(paramBillingType as any);

            // Set Subject Extra and Partial Number
            if (paramSubjectExtra) {
                setSubjectExtra(paramSubjectExtra);
            } else if (paramPartialNumber && paramBillingType === 'partial') {
                setSubjectExtra(`${paramPartialNumber}. Teilrechnung`);
            } else if (paramBillingType === 'final') {
                setSubjectExtra('Schlussrechnung');
            } else if (paramBillingType === 'partial') {
                const nextNumber = previousInvoices.length + 1;
                setSubjectExtra(`${nextNumber}. Teilrechnung`);
            }

            if (paramPartialNumber) {
                const num = parseInt(paramPartialNumber);
                if (!isNaN(num)) setPartialPaymentNumber(num);
            }

            // Handle Amount and First Item prefill
            if (paramAmount || paramSubjectExtra) {
                const amount = paramAmount ? parseFloat(paramAmount) : 0;
                const activeBillingType = (paramBillingType as any) || billingType;

                if (!isNaN(amount) && amount > 0) {
                    if (activeBillingType === 'final') {
                        // For Final Invoice: 
                        // 1. Add Total Project Sum (estimate or budget)
                        const proj = projects.find(p => p.id === paramProjectId);
                        const totalBudget = proj?.budget || 0;

                        const finalItems: InvoiceItem[] = [{
                            id: 'budget-1',
                            description: `Gesamtleistung laut Auftrag (${proj?.name || 'Projekt'})`,
                            quantity: 1,
                            unit: 'pauschal',
                            pricePerUnit: totalBudget,
                            totalPrice: totalBudget
                        }];

                        // 2. Subtract Previous Partial Invoices
                        const prevInvs = (invoices as Invoice[])
                            .filter(inv => inv.projectId === paramProjectId && inv.billingType === 'partial' && inv.status !== 'canceled' && inv.id !== initialData?.id);

                        prevInvs.forEach((inv, idx) => {
                            finalItems.push({
                                id: Math.random().toString(36).substr(2, 9),
                                description: `abzgl. ${idx + 1}. Teilrechnung Nr. ${inv.invoiceNumber}`,
                                quantity: 1,
                                unit: 'pauschal',
                                pricePerUnit: -inv.subtotal,
                                totalPrice: -inv.subtotal
                            });
                        });

                        setItems(finalItems);
                    } else {
                        // Standard or Partial
                        setItems([{
                            id: '1',
                            description: paramSubjectExtra || '',
                            quantity: 1,
                            unit: 'pauschal',
                            pricePerUnit: amount,
                            totalPrice: amount
                        }]);
                    }
                }
            }
        }
    }, [settings, isSettingsLoading, initialData, searchParams, projects, isProjectsLoading, isCustomersLoading, invoices, isInvoicesLoading]);

    // Helper: Calculate item total
    const calculateItemTotal = (qty: number, price: number) => {
        return Number((qty * price).toFixed(2));
    };

    // UI State for calculations
    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + item.totalPrice, 0);
    }, [items]);

    const isReverseCharge = useMemo(() => {
        const customer = customers.find(c => c.id === customerId);
        return customer?.type === 'business' && !!customer?.reverseChargeEnabled;
    }, [customerId, customers]);

    const taxAmount = useMemo(() => {
        if (isReverseCharge) return 0;
        const rate = settings?.defaultTaxRate || 20;
        return Number((subtotal * (rate / 100)).toFixed(2));
    }, [subtotal, settings, isReverseCharge]);

    const totalAmount = useMemo(() => {
        return Number((subtotal + taxAmount).toFixed(2));
    }, [subtotal, taxAmount]);

    const previousInvoices = useMemo(() => {
        if (!projectId || billingType === 'standard') return [];

        return invoices
            .filter(inv => inv.projectId === projectId && inv.billingType === 'partial' && inv.status !== 'canceled' && inv.id !== initialData?.id)
            .map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                date: inv.issueDate,
                amount: inv.subtotal // Store Net for deduction logic
            }));
    }, [projectId, billingType, invoices, initialData]);

    // Handlers
    const addItem = () => {
        const newItem: InvoiceItem = {
            id: Math.random().toString(36).substr(2, 9),
            description: '',
            quantity: 1,
            unit: 'Stk',
            pricePerUnit: 0,
            totalPrice: 0
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'pricePerUnit') {
                    updated.totalPrice = calculateItemTotal(
                        field === 'quantity' ? Number(value) : item.quantity,
                        field === 'pricePerUnit' ? Number(value) : item.pricePerUnit
                    );
                }
                return updated;
            }
            return item;
        }));
    };

    const batchUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, ...updates };
                if ('quantity' in updates || 'pricePerUnit' in updates) {
                    updated.totalPrice = calculateItemTotal(
                        updated.quantity,
                        updated.pricePerUnit
                    );
                }
                return updated;
            }
            return item;
        }));
    };

    const handleSave = (status: InvoiceStatus) => {
        const customer = customers.find(c => c.id === customerId);

        const invoiceData: Invoice = {
            id: initialData?.id || Math.random().toString(36).substr(2, 9),
            invoiceNumber,
            subjectExtra,
            constructionProject,
            issueDate,
            paymentTerms,
            performancePeriod: { from: perfFrom, to: perfTo },
            customerId,
            customerName: customer?.name || 'Unbekannter Kunde',
            processor,
            items,
            subtotal,
            taxRate: isReverseCharge ? 0 : (settings?.defaultTaxRate || 20),
            taxAmount,
            totalAmount,
            isReverseCharge,
            status,
            projectId,
            paymentPlanItemId,
            billingType,
            partialPaymentNumber: billingType === 'partial' ? (partialPaymentNumber || previousInvoices.length + 1) : undefined,
            previousInvoices: (billingType === 'partial' || billingType === 'final') ? previousInvoices : undefined,
            createdAt: initialData?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (initialData?.id) {
            updateInvoice(initialData.id, invoiceData);
        } else {
            addInvoice(invoiceData);
            // Increment invoice number for next invoice
            updateSettings({ nextInvoiceNumber: settings.nextInvoiceNumber + 1 });
        }

        // Generate PDF if finalized
        if (status === 'pending' || status === 'paid') {
            setSavingStatus(status);
            return;
        }

        router.push('/dashboard'); // Or invoices list
    };

    const handleSaveNewCustomer = (newCustomer: Customer) => {
        addCustomer(newCustomer);
        setCustomerId(newCustomer.id);
        setIsCustomerModalOpen(false);
    };

    const handleServiceSelect = (service: Service) => {
        if (activeServiceItemId) {
            batchUpdateItem(activeServiceItemId, {
                description: service.title,
                pricePerUnit: service.price,
                unit: service.unit as any
            });
            setActiveServiceItemId(null);
        }
    };

    const inputClasses = "w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";
    const sectionTitleClasses = "text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3";

    if (isCustomersLoading || isSettingsLoading || isCompanyLoading || isProjectsLoading) {
        const loadingWhat = [];
        if (isCustomersLoading) loadingWhat.push('Kunden');
        if (isSettingsLoading) loadingWhat.push('Einstellungen');
        if (isCompanyLoading) loadingWhat.push('Firmendaten');
        if (isProjectsLoading) loadingWhat.push('Projekte');

        return (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                <div className="text-slate-500 font-bold text-xl">Laden...</div>
                <div className="text-slate-400 text-sm">Bereite vor: {loadingWhat.join(', ')}</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">
                        <ArrowLeft className="h-4 w-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => router.back()} />
                        Rechnungserstellung
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">Neue Rechnung</h1>
                    <p className="text-slate-500 font-medium">Erstellen Sie eine neue Rechnung für Ihre Kunden</p>
                </div>
            </div>

            <div className="glass-card p-12 space-y-12">
                {/* Section: Basic Data */}
                <div className="space-y-8">
                    <h2 className={sectionTitleClasses}>
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <Calculator className="h-5 w-5 text-indigo-600" />
                        </div>
                        Rechnung erstellen
                    </h2>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Projekt (Optional)</label>
                            <select
                                value={projectId}
                                onChange={(e) => {
                                    const pid = e.target.value;
                                    setProjectId(pid);
                                    const proj = projects.find(p => p.id === pid);
                                    if (proj) {
                                        setCustomerId(proj.customerId);
                                        setConstructionProject(`${proj.name} - ${proj.address.street}, ${proj.address.city}`);
                                    }
                                }}
                                className={cn(inputClasses, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat")}
                            >
                                <option value="">Kein Projekt ausgewählt</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClasses}>Rechnungsart</label>
                                <select
                                    value={billingType}
                                    onChange={(e) => setBillingType(e.target.value as any)}
                                    className={cn(inputClasses, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat")}
                                >
                                    <option value="standard">Standardrechnung</option>
                                    <option value="partial">Abschlagsrechnung (Teilrechnung)</option>
                                    <option value="final">Schlussrechnung</option>
                                </select>
                            </div>
                            {billingType === 'partial' && (
                                <div>
                                    <label className={labelClasses}>Teilrechnungs-Nummer (z.B. 1, 2, ...)</label>
                                    <input
                                        type="number"
                                        value={partialPaymentNumber || ''}
                                        onChange={(e) => setPartialPaymentNumber(parseInt(e.target.value) || undefined)}
                                        className={inputClasses}
                                        placeholder="Automatischer Vorschlag..."
                                    />
                                    <p className="text-xs text-slate-400 mt-1 ml-1 font-medium">Standardmäßig wird die Nummer automatisch basierend auf dem Projekt berechnet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Rechnungsnummer</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className={inputClasses}
                                placeholder="z.B. 2026/04"
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Zusatz zum Betreff</label>
                            <input
                                type="text"
                                value={subjectExtra}
                                onChange={(e) => setSubjectExtra(e.target.value)}
                                className={inputClasses}
                                placeholder="z.B. Ihre Kundennummer"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Bauvorhaben</label>
                            <input
                                type="text"
                                value={constructionProject}
                                onChange={(e) => setConstructionProject(e.target.value)}
                                className={inputClasses}
                                placeholder="Projektname / Ort"
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Rechnungsdatum</label>
                            <DatePicker
                                value={issueDate}
                                onChange={setIssueDate}
                                placeholder="Datum wählen"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClasses}>Zahlungskonditionen</label>
                        <select
                            value={settings.paymentTerms.find(t => t.text === paymentTerms)?.id || ''}
                            onChange={(e) => {
                                const term = settings.paymentTerms.find(t => t.id === e.target.value);
                                if (term) setPaymentTerms(term.text);
                            }}
                            className={cn(inputClasses, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat")}
                        >
                            <option value="" disabled>Zahlungskondition wählen...</option>
                            {settings.paymentTerms.map(term => (
                                <option key={term.id} value={term.id}>{term.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Section: Service Period */}
                <div className="space-y-8">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Leistungszeitraum</h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Von</label>
                            <DatePicker
                                value={perfFrom}
                                onChange={setPerfFrom}
                                placeholder="Beginn wählen"
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Bis</label>
                            <DatePicker
                                value={perfTo}
                                onChange={setPerfTo}
                                placeholder="Ende wählen"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Section: Customer Data */}
                <div className="space-y-8">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Kundendaten</h3>
                    <div className="space-y-4">
                        <label className={labelClasses}>Kunde auswählen</label>
                        <CustomerSearchSelect
                            customers={customers}
                            selectedId={customerId}
                            onSelect={setCustomerId}
                            onAddNew={() => setIsCustomerModalOpen(true)}
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Bearbeiter</label>
                        <input
                            type="text"
                            value={processor}
                            onChange={(e) => setProcessor(e.target.value)}
                            className={inputClasses}
                        />
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Section: Items */}
                <div className="space-y-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Rechnungspositionen</h3>
                        <div className="flex gap-4">
                            <button
                                onClick={addItem}
                                className="bg-indigo-50 text-indigo-600 px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 transition-all"
                            >
                                <PlusCircle className="h-4 w-4" /> Leistung hinzufügen
                            </button>
                            <button
                                onClick={addItem}
                                className="bg-blue-50 text-blue-600 px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-100 transition-all"
                            >
                                <Plus className="h-4 w-4" /> Leere Position
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-16">Pos.</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Bezeichnung</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-32">Menge</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-44">Einheit</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-44">Einzelpreis</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-40">Gesamt</th>
                                    <th className="px-6 py-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map((item, index) => (
                                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-400">{index + 1}</td>
                                        <td className="px-4 py-2 relative">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    className={cn(inputClasses, "py-3 px-4 flex-1 border-slate-100 min-w-[200px]")}
                                                    placeholder="Leistungsbeschreibung"
                                                />
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveServiceItemId(item.id)}
                                                        className="h-11 w-11 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-100"
                                                        title="Aus Vorlage wählen"
                                                    >
                                                        <Book className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                className={cn(inputClasses, "py-3 px-4 border-slate-100 text-center no-spinner")}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                value={item.unit}
                                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                className={cn(inputClasses, "py-3 px-4 border-slate-100")}
                                            >
                                                <option value="PA">PA (Pauschal)</option>
                                                <option value="h">h (Stunden)</option>
                                                <option value="Stk">Stk (Stück)</option>
                                                <option value="m">m (Meter)</option>
                                                <option value="m²">m² (Quadratmeter)</option>
                                                <option value="m³">m³ (Kubikmeter)</option>
                                                <option value="kg">kg (Kilogramm)</option>
                                                <option value="Tag">Tag (Tage)</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={item.pricePerUnit}
                                                    onChange={(e) => updateItem(item.id, 'pricePerUnit', e.target.value)}
                                                    className={cn(inputClasses, "py-3 px-4 border-slate-100 text-right pr-4 no-spinner")}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900 text-right">
                                            € {item.totalPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                disabled={items.length === 1}
                                                className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-0"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="flex justify-end pt-4">
                        <div className="w-auto min-w-[24rem] bg-indigo-50/50 rounded-[2rem] p-8 space-y-4 border border-indigo-100/50 transition-all duration-300">
                            <div className="flex justify-between items-center text-slate-600 font-bold gap-8">
                                <span>Zwischensumme:</span>
                                <span className="whitespace-nowrap">€ {subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 font-bold gap-8">
                                <span>{isReverseCharge ? "0% USt.:" : `Steuer (${settings?.defaultTaxRate || 20}%):`}</span>
                                <span className="whitespace-nowrap">€ {taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="pt-4 border-t border-indigo-200/50 flex justify-between items-center gap-8">
                                <span className="text-2xl font-black text-slate-900 whitespace-nowrap">Gesamtbetrag:</span>
                                <span className="text-3xl font-black text-indigo-600 whitespace-nowrap">
                                    € {totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-10 flex justify-end gap-6">
                    <button
                        onClick={() => handleSave('draft')}
                        className="px-10 py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/10 active:scale-95"
                    >
                        Als Entwurf speichern
                    </button>
                    <button
                        onClick={() => handleSave('pending')}
                        className="px-10 py-5 bg-primary-gradient text-white rounded-2xl font-black text-lg flex items-center gap-3 shadow-xl shadow-indigo-500/25 hover:scale-[1.02] transition-all active:scale-95"
                    >
                        <Save className="h-6 w-6" /> Finalisieren & Speichern
                    </button>
                </div>
                {/* Hidden PDF Container */}
                <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                    <InvoicePDF
                        ref={pdfRef}
                        invoice={{
                            id: initialData?.id || 'temp-id',
                            invoiceNumber,
                            subjectExtra,
                            constructionProject,
                            issueDate,
                            paymentTerms,
                            performancePeriod: { from: perfFrom, to: perfTo },
                            customerId,
                            customerName: customers.find(c => c.id === customerId)?.name || '',
                            processor,
                            items,
                            subtotal,
                            taxRate: isReverseCharge ? 0 : (settings?.defaultTaxRate || 20),
                            taxAmount,
                            totalAmount,
                            isReverseCharge,
                            status: 'pending', // Temporary status for preview
                            projectId,
                            paymentPlanItemId,
                            billingType,
                            partialPaymentNumber: billingType === 'partial' ? (partialPaymentNumber || previousInvoices.length + 1) : undefined,
                            previousInvoices: (billingType === 'partial' || billingType === 'final') ? previousInvoices : undefined,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }}
                        customer={customers.find(c => c.id === customerId)}
                        companySettings={companySettings}
                    />
                </div>

                <CustomerModal
                    isOpen={isCustomerModalOpen}
                    onClose={() => setIsCustomerModalOpen(false)}
                    onSave={handleSaveNewCustomer}
                    existingCustomers={customers}
                />

                {/* Hidden Print Handler */}
                {savingStatus && (
                    <InvoicePrintHandler onAfterPrint={() => {
                        setSavingStatus(null);
                        router.push('/dashboard');
                    }}>
                        <InvoicePDF
                            invoice={{
                                id: initialData?.id || 'temp-id',
                                invoiceNumber: invoiceNumber,
                                subjectExtra: subjectExtra,
                                constructionProject: constructionProject,
                                issueDate: issueDate,
                                paymentTerms: paymentTerms,
                                performancePeriod: { from: perfFrom, to: perfTo },
                                customerId,
                                customerName: customers.find(c => c.id === customerId)?.name || '',
                                processor,
                                items,
                                subtotal,
                                taxRate: isReverseCharge ? 0 : (settings?.defaultTaxRate || 20),
                                taxAmount,
                                totalAmount,
                                isReverseCharge,
                                status: savingStatus,
                                projectId,
                                paymentPlanItemId,
                                billingType,
                                partialPaymentNumber: billingType === 'partial' ? (partialPaymentNumber || previousInvoices.length + 1) : undefined,
                                previousInvoices: (billingType === 'partial' || billingType === 'final') ? previousInvoices : undefined,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }}
                            customer={customers.find(c => c.id === customerId)}
                            companySettings={companySettings}
                        />
                    </InvoicePrintHandler>
                )}

                <ServiceSelectionModal
                    isOpen={activeServiceItemId !== null}
                    onClose={() => setActiveServiceItemId(null)}
                    onSelect={handleServiceSelect}
                    services={services}
                    onCreateNew={() => setIsServiceModalOpen(true)}
                />

                <ServiceModal
                    isOpen={isServiceModalOpen}
                    onClose={() => setIsServiceModalOpen(false)}
                    onSave={(newService) => {
                        addService(newService);
                        handleServiceSelect(newService);
                        setIsServiceModalOpen(false);
                    }}
                />
            </div>
        </div >
    );
}
