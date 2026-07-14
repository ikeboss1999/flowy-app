export type CustomerType = 'private' | 'business';
export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'draft';

export interface Address {
    street: string;
    city: string;
    zip: string;
}

export interface Customer {
    id: string;
    type: CustomerType;
    status: CustomerStatus;
    salutation?: string; // e.g., Herr, Frau, Familie
    name: string;
    contactPerson?: string; // Optional Ansprechpartner for business customers
    email: string;
    phone: string;
    address: Address;
    taxId?: string; // Optional for business customers
    commercialRegisterNumber?: string; // Optional for business customers (Firmenbuchnummer)
    reverseChargeEnabled?: boolean; // Only for business customers
    notes?: string;
    defaultPaymentTermId?: string; // Reference to custom payment terms in settings
    customer_number?: string; // Auto-generated or custom customer number
    createdAt: string;
    updatedAt: string;
    lastActivity?: string; // Added last activity
    userId?: string; // Owner of the customer data
}
