import { Invoice } from "@/types/invoice";
import { Offer } from "@/types/offer";
import { OrderConfirmation } from "@/types/order";

function sanitizeFilePart(value: string | number | undefined | null, fallback: string) {
    const cleaned = String(value ?? fallback)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, "und")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-_.]+|[-_.]+$/g, "");

    return cleaned || fallback;
}

function buildName(parts: Array<string | number | undefined | null>) {
    return `${parts.map((part) => sanitizeFilePart(part, "Dokument")).filter(Boolean).join("_")}.pdf`;
}

export function invoicePdfFileName(invoice: Pick<Invoice, "invoiceNumber" | "customerName">) {
    return buildName(["Rechnung", invoice.invoiceNumber, invoice.customerName]);
}

export function offerPdfFileName(offer: Pick<Offer, "offerNumber" | "customerName" | "documentType">) {
    const prefix = offer.documentType === "estimate" ? "Kostenvoranschlag" : "Angebot";
    return buildName([prefix, offer.offerNumber, offer.customerName]);
}

export function orderPdfFileName(order: Pick<OrderConfirmation, "orderNumber" | "customerName">) {
    return buildName(["Auftrag", order.orderNumber, order.customerName]);
}

export function timesheetPdfFileName(employeeName: string, month: string) {
    return buildName(["Stundenzettel", employeeName, month]);
}
