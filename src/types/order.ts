import { OfferUnit } from './offer';

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface OrderItem {
    id: string;
    title?: string;
    description: string;
    itemType?: 'title' | 'standard' | 'detailed';
    quantity: number;
    unit: OfferUnit;
    pricePerUnit: number;
    totalPrice: number;
}

export interface OrderSettings {
    nextOrderNumber: number;
    prefix: string;
    defaultIntroText: string;
    defaultTerms: string;
    emailSubject?: string;
    emailBody?: string;
}

export interface OrderConfirmation {
    id: string;
    orderNumber: string;
    offerId?: string; // Reference to the original offer
    offerNumber?: string; // Storing the offer number for quick reference
    projectId?: string; // Connection to project
    customerId: string;
    customerName: string;
    issueDate: string;
    deliveryDate?: string; // Target execution/delivery date
    subjectExtra?: string;
    constructionProject?: string;
    processor: string;
    introText?: string;
    items: OrderItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    isReverseCharge?: boolean;
    status: OrderStatus;
    notes?: string;
    terms?: string;
    createdAt: string;
    updatedAt: string;
    userId?: string;
    pdfUrl?: string; // Stored PDF reference: private Storage path for new PDFs, legacy public URL for older PDFs
    pdfPath?: string; // Optional future/private Storage path field
}
