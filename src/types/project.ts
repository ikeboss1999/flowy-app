export type ProjectStatus = 'active' | 'completed' | 'planned' | 'on_hold';

export interface Project {
    id: string;
    name: string; // Baustellenname / Bezeichnung
    customerId: string;
    description?: string;
    status: ProjectStatus;
    address: {
        street: string;
        city: string;
        zip: string;
    };
    startDate?: string;
    endDate?: string;
    budget?: number; // Optional budget limit
    paymentPlan?: PaymentPlanItem[];
    createdAt: string;
    updatedAt: string;
    userId?: string; // Owner of the project
}

export interface PaymentPlanItem {
    id: string;
    name: string; // e.g. "1. Teilrechnung"
    amount: number; // Net amount
    status: 'planned' | 'created' | 'paid';
    invoiceId?: string; // Link to actual invoice
    dueDate?: string; // Optional planned date
    description?: string; // Additional details
}
