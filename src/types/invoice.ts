export interface DunningLevel {
    fee: number;
    period: number;
}

export interface PaymentTerm {
    id: string;
    name: string;
    text: string;
    days: number;
}

export interface InvoiceSettings {
    // Allgemeine Rechnungseinstellungen
    invoicePrefix: string;
    nextInvoiceNumber: number;
    employeePrefix: string;
    nextEmployeeNumber: number;
    paymentTerms: PaymentTerm[];
    defaultPaymentTermId: string;
    defaultTaxRate: number;
    defaultCurrency: string;

    // Mahnwesen Einstellungen
    dunningLevels: {
        level1: DunningLevel; // Zahlungserinnerung
        level2: DunningLevel; // 1. Mahnung
        level3: DunningLevel; // 2. Mahnung
        level4: DunningLevel; // Letzte Mahnung
    };
}

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'canceled';
export type InvoiceUnit = 'PA' | 'h' | 'Stk' | 'm' | 'm²' | 'm³' | 'kg' | 'Tag' | 'pauschal';

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unit: InvoiceUnit;
    pricePerUnit: number;
    totalPrice: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    subjectExtra?: string; // Zusatz zum Betreff
    constructionProject?: string; // Bauvorhaben
    issueDate: string; // Rechnungsdatum
    paymentTerms: string; // Zahlungskonditionen
    performancePeriod: {
        from?: string;
        to?: string;
    }; // Leistungszeitraum
    customerId: string;
    customerName: string;
    processor: string; // Bearbeiter
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    isReverseCharge?: boolean;
    status: InvoiceStatus;
    paidAmount?: number; // Tatsächlich bezahlter Betrag
    paymentDeviation?: {
        amount: number; // Abweichung (paidAmount - totalAmount)
        reason: string; // Grund der Abweichung
    };
    // Project & Billing Fields
    projectId?: string;
    paymentPlanItemId?: string;
    billingType?: 'standard' | 'partial' | 'final';
    partialPaymentNumber?: number; // 1, 2, 3... for partial invoices

    // For final/partial invoices to track history
    previousInvoices?: {
        id: string;
        invoiceNumber: string;
        date: string;
        amount: number; // Netto or Gross depending on calculation, usually Gross for payment deduction
    }[];

    notes?: string;
    dunningLevel?: number; // 0 = Keine Mahnung, 1 = Zahlungserinnerung, 2 = 1. Mahnung, 3 = 2. Mahnung, 4 = Letzte Mahnung
    lastDunningDate?: string;
    dunningHistory?: {
        level: number;
        date: string;
        fee: number;
    }[];
    createdAt: string;
    updatedAt: string;
    userId?: string; // Owner of the invoice
}
