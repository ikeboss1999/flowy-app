import { InvoiceUnit } from "./invoice";

export interface Service {
    id: string;
    userId: string;
    title: string;
    description?: string;
    unit: InvoiceUnit;
    price: number;
    category?: 'Labor' | 'Material' | 'FlatRate' | 'Other' | 'Position';
    itemType?: 'standard' | 'detailed'; // Support for different position types
    createdAt: string;
    updatedAt: string;
}
