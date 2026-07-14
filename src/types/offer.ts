export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type OfferUnit = 'PA' | 'h' | 'Stk' | 'm' | 'm²' | 'm³' | 'kg' | 'Tag' | 'pauschal';

export interface OfferItem {
    id: string;
    title?: string;
    description: string;
    itemType?: 'title' | 'standard' | 'detailed' | 'info';
    quantity: number;
    unit: OfferUnit;
    pricePerUnit: number;
    totalPrice: number;
}

export interface OfferSettings {
    nextOfferNumber: number;
    defaultIntroText: string;
    defaultValidityDays?: number;
    emailSubject?: string;
    emailBody?: string;
}

export interface Offer {
    id: string;
    offerNumber: string;
    documentType?: 'offer' | 'estimate';
    subjectExtra?: string;
    constructionProject?: string;
    issueDate: string;
    validUntil?: string;
    customerId: string;
    customerName: string;
    processor: string;
    introText?: string;
    items: OfferItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    isReverseCharge?: boolean;
    status: OfferStatus;
    projectId?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    userId?: string;
    pdfUrl?: string; // Stored PDF reference: private Storage path for new PDFs, legacy public URL for older PDFs
    pdfPath?: string; // Optional future/private Storage path field
}
