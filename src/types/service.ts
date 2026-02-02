import { InvoiceUnit } from "./invoice";

export interface Service {
    id: string;
    userId: string;
    title: string;
    description?: string;
    unit: InvoiceUnit;
    price: number;
    category?: 'Labor' | 'Material' | 'FlatRate' | 'Other';
    createdAt: string;
    updatedAt: string;
}
