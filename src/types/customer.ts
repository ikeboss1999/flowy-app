export type CustomerType = 'private' | 'business';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

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
    email: string;
    phone: string;
    address: Address;
    taxId?: string; // Optional for business customers
    reverseChargeEnabled?: boolean; // Only for business customers
    notes?: string;
    createdAt: string;
    updatedAt: string;
    lastActivity?: string; // Added last activity
    userId?: string; // Owner of the customer data
}
