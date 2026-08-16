export interface EmailDeliverySettings {
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: 'starttls' | 'ssl' | 'none';
    smtpUser: string;
    smtpPassword?: string;
    smtpPasswordEncrypted?: string;
    hasSmtpPassword?: boolean;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    signature: string;
    signatureHtml?: string;
}

export interface EmailSendLog {
    id: string;
    documentType: 'offer' | 'invoice' | 'order' | 'dunning';
    documentId: string;
    documentNumber: string;
    recipient: string;
    cc?: string;
    bcc?: string;
    subject: string;
    status: 'success' | 'error';
    errorMessage?: string;
    sentAt: string;
    sentBy?: string;
}

export interface EmailSettingsData {
    delivery: EmailDeliverySettings;
    logs: EmailSendLog[];
}
