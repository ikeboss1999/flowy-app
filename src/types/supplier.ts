export type SupplierStatus = "active" | "inactive" | "blocked";

export interface Supplier {
    id: string;
    userId?: string;
    supplierNumber: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
    vatNumber?: string;
    commercialRegisterNumber?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    paymentTermId?: string;
    defaultCategory?: string;
    notes?: string;
    status: SupplierStatus;
    createdAt: string;
    updatedAt: string;
}
