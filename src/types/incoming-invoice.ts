export const INCOMING_INVOICE_STATUSES = [
    'new',
    'extracting',
    'review',
    'approved',
    'paid',
    'overdue',
    'duplicate',
    'rejected',
    'failed',
] as const;

export type IncomingInvoiceStatus = (typeof INCOMING_INVOICE_STATUSES)[number];
export type IncomingInvoiceSource = 'manual_upload' | 'imap';

export interface IncomingInvoiceItem {
    id: string;
    invoiceId: string;
    positionNumber: number;
    description: string;
    quantity?: number | null;
    unit?: string | null;
    unitPriceNet?: number | null;
    netAmount?: number | null;
    taxRate?: number | null;
    taxAmount?: number | null;
    grossAmount?: number | null;
}

export interface IncomingInvoice {
    id: string;
    userId: string;
    importId?: string | null;
    supplierId?: string | null;
    sourceType: IncomingInvoiceSource;
    status: IncomingInvoiceStatus;
    originalFilePath: string;
    originalFileName: string;
    pageFrom?: number | null;
    pageTo?: number | null;
    supplierName?: string | null;
    supplierVatNumber?: string | null;
    supplierAddress?: Record<string, string> | null;
    invoiceNumber?: string | null;
    issueDate?: string | null;
    dueDate?: string | null;
    paymentTerms?: string | null;
    discountPercent?: number | null;
    discountDueDate?: string | null;
    discountAmount?: number | null;
    discountedGrossAmount?: number | null;
    netAmount?: number | null;
    taxAmount?: number | null;
    grossAmount?: number | null;
    currency: string;
    iban?: string | null;
    bic?: string | null;
    paymentReference?: string | null;
    category?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    notes?: string | null;
    extractionConfidence?: number | null;
    extractedData?: { warnings?: string[]; source?: string; extractedAt?: string } | null;
    isDuplicate: boolean;
    isFlagged?: boolean;
    decisionReason?: string | null;
    decisionAt?: string | null;
    decisionBy?: string | null;
    duplicateOfInvoiceId?: string | null;
    reviewRequired: boolean;
}
