export type InquiryChannel = 'website' | 'phone' | 'instagram' | 'email' | 'recommendation' | 'other';
export type InquiryStatus = 'new' | 'contacted' | 'offered' | 'won' | 'lost';

export interface Inquiry {
    id: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    channel: InquiryChannel;
    projectDescription: string;
    location: string;
    status: InquiryStatus;
    budget?: number;
    createdAt: string;
    updatedAt: string;
    userId: string;
}

export interface InquiryNote {
    id: string;
    inquiryId: string;
    content: string;
    createdAt: string;
    createdBy: string;
}
