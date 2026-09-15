export type SubcontractorStatus = 'active' | 'inactive' | 'blocked';

export interface Subcontractor {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    street?: string;
    zip?: string;
    city?: string;
    taxId?: string;
    commercialRegisterNumber?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    paymentTermId?: string;
    workAreas?: string[];
    beitragskontonummer?: string;
    hfuListed?: boolean;
    notes?: string;
    status: SubcontractorStatus;
    subcontractor_number?: string;
    userId?: string;
    createdAt: string;
    updatedAt: string;
}
