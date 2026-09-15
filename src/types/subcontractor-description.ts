import { OfferItem } from "@/types/offer";

export type SubcontractorDescriptionStatus = "draft" | "sent" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface SubcontractorDescription {
    id: string;
    documentNumber: string;
    offerId: string;
    offerNumber?: string;
    projectId?: string;
    projectName?: string;
    subcontractorId: string;
  subcontractorName?: string;
  subcontractorStreet?: string;
  subcontractorZip?: string;
  subcontractorCity?: string;
    customerId?: string;
    customerName?: string;
    showCustomer: boolean;
    issueDate: string;
    dueDate?: string;
    constructionProject?: string;
    processor?: string;
    introText?: string;
    items: OfferItem[];
    notes?: string;
    materialResponsibility?: string;
    status: SubcontractorDescriptionStatus;
    createdAt: string;
    updatedAt: string;
    userId?: string;
    pdfPath?: string;
}
