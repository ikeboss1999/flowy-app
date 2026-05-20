export interface Letter {
    id: string;
    userId: string;
    customerId?: string;
    recipientName: string;
    recipientAddress: string;
    date: string;
    city: string;
    subject: string;
    salutation: string;
    bodyText: string;
    signOff: string;
    createdAt?: string;
    updatedAt?: string;
    pdfUrl?: string;
}
