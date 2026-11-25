import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExtractedItem = {
    description: string;
    quantity: number | null;
    unit: string | null;
    unitPriceNet: number | null;
    netAmount: number | null;
    taxRate: number | null;
    taxAmount: number | null;
    grossAmount: number | null;
};

type Extraction = {
    supplierName: string | null;
    supplierVatNumber: string | null;
    supplierContactPerson: string | null;
    supplierEmail: string | null;
    supplierPhone: string | null;
    supplierCommercialRegisterNumber: string | null;
    supplierAddress: { street: string | null; zip: string | null; city: string | null; country: string | null };
    invoiceNumber: string | null;
    issueDate: string | null;
    servicePeriodFrom: string | null;
    servicePeriodTo: string | null;
    currency: string | null;
    netAmount: number | null;
    taxAmount: number | null;
    grossAmount: number | null;
    dueDate: string | null;
    paymentTerms: string | null;
    discountPercent: number | null;
    discountDueDate: string | null;
    discountAmount: number | null;
    discountedGrossAmount: number | null;
    iban: string | null;
    bic: string | null;
    paymentReference: string | null;
    category: string | null;
    items: ExtractedItem[];
    confidence: number;
    warnings: string[];
};

const extractionSchema = {
    type: "object",
    additionalProperties: false,
    required: ["supplierName", "supplierVatNumber", "supplierContactPerson", "supplierEmail", "supplierPhone", "supplierCommercialRegisterNumber", "supplierAddress", "invoiceNumber", "issueDate", "servicePeriodFrom", "servicePeriodTo", "currency", "netAmount", "taxAmount", "grossAmount", "dueDate", "paymentTerms", "discountPercent", "discountDueDate", "discountAmount", "discountedGrossAmount", "iban", "bic", "paymentReference", "category", "items", "confidence", "warnings"],
    properties: {
        supplierName: { type: ["string", "null"] }, supplierVatNumber: { type: ["string", "null"] }, supplierContactPerson: { type: ["string", "null"] }, supplierEmail: { type: ["string", "null"] }, supplierPhone: { type: ["string", "null"] }, supplierCommercialRegisterNumber: { type: ["string", "null"] },
        supplierAddress: { type: "object", additionalProperties: false, required: ["street", "zip", "city", "country"], properties: { street: { type: ["string", "null"] }, zip: { type: ["string", "null"] }, city: { type: ["string", "null"] }, country: { type: ["string", "null"] } } },
        invoiceNumber: { type: ["string", "null"] }, issueDate: { type: ["string", "null"] }, servicePeriodFrom: { type: ["string", "null"] }, servicePeriodTo: { type: ["string", "null"] }, currency: { type: ["string", "null"] },
        netAmount: { type: ["number", "null"] }, taxAmount: { type: ["number", "null"] }, grossAmount: { type: ["number", "null"] }, dueDate: { type: ["string", "null"] }, paymentTerms: { type: ["string", "null"] }, discountPercent: { type: ["number", "null"] }, discountDueDate: { type: ["string", "null"] }, discountAmount: { type: ["number", "null"] }, discountedGrossAmount: { type: ["number", "null"] },
        iban: { type: ["string", "null"] }, bic: { type: ["string", "null"] }, paymentReference: { type: ["string", "null"] }, category: { type: ["string", "null"] },
        items: { type: "array", items: { type: "object", additionalProperties: false, required: ["description", "quantity", "unit", "unitPriceNet", "netAmount", "taxRate", "taxAmount", "grossAmount"], properties: { description: { type: "string" }, quantity: { type: ["number", "null"] }, unit: { type: ["string", "null"] }, unitPriceNet: { type: ["number", "null"] }, netAmount: { type: ["number", "null"] }, taxRate: { type: ["number", "null"] }, taxAmount: { type: ["number", "null"] }, grossAmount: { type: ["number", "null"] } } } },
        confidence: { type: "number" }, warnings: { type: "array", items: { type: "string" } },
    },
};

const extractionInstructions = `Du liest eine deutschsprachige oder internationale Eingangsrechnung aus. Gib ausschließlich die angeforderte JSON-Struktur zurück. Erfinde niemals Werte: wenn ein Wert nicht eindeutig lesbar ist, gib null zurück und nenne den Grund in warnings. Beträge immer als positive Zahlen ohne Währungssymbol und mit Dezimalpunkt. Datum ausschließlich als YYYY-MM-DD. Die Rechnungspositionen vollständig auslesen. Bei Skonto: Prozent, Skontobetrag, Skontofrist und Bruttobetrag nach Skonto getrennt auslesen, soweit vorhanden. Lies alle vorhandenen Lieferanten-Stammdaten aus: Ansprechpartner, E-Mail, Telefonnummer, UID, Firmenbuch- oder Handelsregisternummer sowie IBAN und BIC. category als kurze sachliche Kategorie auf Deutsch vorschlagen, nur wenn der Beleginhalt eindeutig ist. confidence ist deine Gesamt-Einschätzung von 0 bis 1.`;

function text(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function date(value: unknown): string | null {
    const result = text(value);
    return result && /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

function calculatedDueDate(issueDate: string | null, paymentTerms: string | null) {
    if (!issueDate || !paymentTerms) return null;
    const normalizedTerms = paymentTerms.toLocaleLowerCase("de-AT");
    const matches = [...normalizedTerms.matchAll(/(\d{1,3})\s*(?:kalender)?tag(?:e|en)?\b/g)];
    if (!matches.length) {
        // "Zahlbar nach Erhalt der Rechnung" has no numeric period. It is due immediately.
        return /(?:zahlbar\s+)?(?:sofort|bei|nach)\s+(?:rechnungserhalt|erhalt(?:\s+der\s+rechnung)?)/.test(normalizedTerms) ? issueDate : null;
    }
    // Texts such as "3 % Skonto in 7 Tagen, 14 Tage netto" contain two periods.
    // The longest period is the regular payment due date, not the discount deadline.
    const days = Math.max(...matches.map((match) => Number(match[1])).filter(Number.isFinite));
    if (!Number.isFinite(days) || days < 0 || days > 365) return null;
    const result = new Date(`${issueDate}T12:00:00Z`);
    result.setUTCDate(result.getUTCDate() + days);
    return result.toISOString().slice(0, 10);
}

function amount(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}

function normalized(value: string | null | undefined) {
    return (value || "").trim().toLocaleLowerCase("de-AT").replace(/\s+/g, " ");
}

function mimeTypeFromFileName(fileName: string) {
    const extension = fileName.toLowerCase().split(".").pop();
    if (extension === "pdf") return "application/pdf";
    if (extension === "png") return "image/png";
    if (extension === "webp") return "image/webp";
    return "image/jpeg";
}

function responseText(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const body = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> };
    if (typeof body.output_text === "string") return body.output_text;
    for (const item of body.output || []) for (const content of item.content || []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
    return null;
}

function parseExtraction(raw: unknown): Extraction {
    if (!raw || typeof raw !== "object") throw new Error("Die KI-Antwort enthielt keine lesbaren Rechnungsdaten.");
    const value = raw as Record<string, unknown>;
    const address = value.supplierAddress && typeof value.supplierAddress === "object" ? value.supplierAddress as Record<string, unknown> : {};
    const items = Array.isArray(value.items) ? value.items.map((item) => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { description: text(row.description) || "Unbenannte Position", quantity: amount(row.quantity), unit: text(row.unit), unitPriceNet: amount(row.unitPriceNet), netAmount: amount(row.netAmount), taxRate: amount(row.taxRate), taxAmount: amount(row.taxAmount), grossAmount: amount(row.grossAmount) };
    }) : [];
    return {
        supplierName: text(value.supplierName), supplierVatNumber: text(value.supplierVatNumber)?.toUpperCase() || null, supplierContactPerson: text(value.supplierContactPerson), supplierEmail: text(value.supplierEmail), supplierPhone: text(value.supplierPhone), supplierCommercialRegisterNumber: text(value.supplierCommercialRegisterNumber),
        supplierAddress: { street: text(address.street), zip: text(address.zip), city: text(address.city), country: text(address.country) },
        invoiceNumber: text(value.invoiceNumber), issueDate: date(value.issueDate), servicePeriodFrom: date(value.servicePeriodFrom), servicePeriodTo: date(value.servicePeriodTo), currency: (text(value.currency) || "EUR").toUpperCase().slice(0, 3),
        netAmount: amount(value.netAmount), taxAmount: amount(value.taxAmount), grossAmount: amount(value.grossAmount), dueDate: date(value.dueDate), paymentTerms: text(value.paymentTerms), discountPercent: amount(value.discountPercent), discountDueDate: date(value.discountDueDate), discountAmount: amount(value.discountAmount), discountedGrossAmount: amount(value.discountedGrossAmount),
        iban: text(value.iban)?.replace(/\s+/g, "").toUpperCase() || null, bic: text(value.bic)?.replace(/\s+/g, "").toUpperCase() || null, paymentReference: text(value.paymentReference), category: text(value.category), items,
        confidence: Math.max(0, Math.min(1, typeof value.confidence === "number" && Number.isFinite(value.confidence) ? value.confidence : 0)), warnings: Array.isArray(value.warnings) ? value.warnings.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 20) : [],
    };
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    return extractInvoiceForTenant(id, auth.companyOwnerId, auth.actorUserId);
}

export async function extractInvoiceForTenant(id: string, companyOwnerId: string, actorUserId: string) {
    const auth = { companyOwnerId, actorUserId };
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbankverbindung ist nicht konfiguriert." }, { status: 503 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Die KI-Auslesung ist noch nicht konfiguriert." }, { status: 503 });

    try {
        const { data: invoice, error: invoiceError } = await supabaseAdmin.from("incoming_invoices").select("*").eq("id", id).eq("userId", companyOwnerId).maybeSingle();
        if (invoiceError) throw invoiceError;
        if (!invoice) return NextResponse.json({ error: "Eingangsrechnung wurde nicht gefunden." }, { status: 404 });
        if (["paid", "rejected"].includes(invoice.status)) return NextResponse.json({ error: "Eine abgeschlossene Rechnung kann nicht erneut ausgelesen werden." }, { status: 409 });

        await supabaseAdmin.from("incoming_invoices").update({ status: "extracting", updatedAt: new Date().toISOString(), updated_by: auth.actorUserId }).eq("id", id).eq("userId", auth.companyOwnerId);
        const { data: storedFile, error: downloadError } = await supabaseAdmin.storage.from("incoming-invoices").download(invoice.originalFilePath);
        if (downloadError || !storedFile) throw downloadError || new Error("Der Originalbeleg konnte nicht geladen werden.");
        if (storedFile.size > 25 * 1024 * 1024) throw new Error("Der Beleg ist für die KI-Auslesung zu groß (maximal 25 MB).");

        const base64 = Buffer.from(await storedFile.arrayBuffer()).toString("base64");
        // The Responses API expects a complete data URI for inline file content.
        const mimeType = mimeTypeFromFileName(invoice.originalFileName);
        const fileData = `data:${mimeType};base64,${base64}`;
        const fileInput = mimeType === "application/pdf"
            ? { type: "input_file", filename: invoice.originalFileName, file_data: fileData }
            : { type: "input_image", image_url: fileData };
        const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4.1-mini",
                input: [{ role: "developer", content: [{ type: "input_text", text: extractionInstructions }] }, { role: "user", content: [fileInput, { type: "input_text", text: "Bitte lies diese Eingangsrechnung vollständig aus." }] }],
                text: { format: { type: "json_schema", name: "incoming_invoice_extraction", strict: true, schema: extractionSchema } },
            }),
        });
        const openAiPayload = await openAiResponse.json().catch(() => null);
        if (!openAiResponse.ok) {
            const message = openAiPayload && typeof openAiPayload === "object" && "error" in openAiPayload ? (openAiPayload as { error?: { message?: string } }).error?.message : null;
            throw new Error(message || `KI-Auslesung fehlgeschlagen (HTTP ${openAiResponse.status}).`);
        }
        const output = responseText(openAiPayload);
        if (!output) throw new Error("Die KI hat keine auswertbaren Rechnungsdaten zurückgegeben.");
        const extracted = parseExtraction(JSON.parse(output));

        const { data: candidates, error: candidateError } = await supabaseAdmin.from("incoming_invoices").select("id, supplierName, supplierVatNumber, invoiceNumber, grossAmount").eq("userId", auth.companyOwnerId).neq("id", id).not("invoiceNumber", "is", null).limit(200);
        if (candidateError) throw candidateError;
        const dueDate = extracted.dueDate || calculatedDueDate(extracted.issueDate, extracted.paymentTerms);
        if (!extracted.dueDate && dueDate) extracted.warnings.push("Fälligkeit wurde aus der Zahlungskondition berechnet.");
        const duplicate = (candidates || []).find((candidate) => {
            const sameNumber = normalized(candidate.invoiceNumber) && normalized(candidate.invoiceNumber) === normalized(extracted.invoiceNumber);
            const sameSupplier = extracted.supplierVatNumber ? normalized(candidate.supplierVatNumber) === normalized(extracted.supplierVatNumber) : normalized(candidate.supplierName) === normalized(extracted.supplierName);
            const sameAmount = extracted.grossAmount == null || candidate.grossAmount == null || Math.abs(Number(candidate.grossAmount) - extracted.grossAmount) < 0.01;
            return Boolean(sameNumber && sameSupplier && sameAmount);
        });
        const duplicateReasons = [...(Array.isArray(invoice.duplicateReasons) ? invoice.duplicateReasons : []), ...(duplicate ? ["Gleiche Lieferanten- und Rechnungsnummer mit gleichem Bruttobetrag erkannt."] : [])];
        const now = new Date().toISOString();
        const { data: updated, error: updateError } = await supabaseAdmin.from("incoming_invoices").update({
            supplierName: extracted.supplierName, supplierVatNumber: extracted.supplierVatNumber, supplierAddress: extracted.supplierAddress, invoiceNumber: extracted.invoiceNumber, issueDate: extracted.issueDate, servicePeriodFrom: extracted.servicePeriodFrom, servicePeriodTo: extracted.servicePeriodTo, currency: extracted.currency, netAmount: extracted.netAmount, taxAmount: extracted.taxAmount, grossAmount: extracted.grossAmount, dueDate, paymentTerms: extracted.paymentTerms, discountPercent: extracted.discountPercent, discountDueDate: extracted.discountDueDate, discountAmount: extracted.discountAmount, discountedGrossAmount: extracted.discountedGrossAmount, iban: extracted.iban, bic: extracted.bic, paymentReference: extracted.paymentReference, category: extracted.category, extractedData: { warnings: extracted.warnings, source: "openai", extractedAt: now, supplier: { contactPerson: extracted.supplierContactPerson, email: extracted.supplierEmail, phone: extracted.supplierPhone, commercialRegisterNumber: extracted.supplierCommercialRegisterNumber } }, extractionConfidence: extracted.confidence, isDuplicate: Boolean(invoice.isDuplicate || duplicate), duplicateOfInvoiceId: duplicate?.id || invoice.duplicateOfInvoiceId || null, duplicateScore: duplicate ? 1 : invoice.duplicateScore || null, duplicateReasons, status: invoice.isDuplicate || duplicate ? "duplicate" : "review", reviewRequired: true, updatedAt: now, updated_by: auth.actorUserId,
        }).eq("id", id).eq("userId", auth.companyOwnerId).select().single();
        if (updateError || !updated) throw updateError || new Error("Ausgelesene Rechnungsdaten konnten nicht gespeichert werden.");

        await supabaseAdmin.from("incoming_invoice_items").delete().eq("invoiceId", id).eq("userId", auth.companyOwnerId);
        if (extracted.items.length) {
            const { error: itemsError } = await supabaseAdmin.from("incoming_invoice_items").insert(extracted.items.map((item, index) => ({ id: nanoid(), userId: auth.companyOwnerId, invoiceId: id, positionNumber: index + 1, description: item.description, quantity: item.quantity, unit: item.unit, unitPriceNet: item.unitPriceNet, netAmount: item.netAmount, taxRate: item.taxRate, taxAmount: item.taxAmount, grossAmount: item.grossAmount, rawData: {}, createdAt: now, updatedAt: now, created_by: auth.actorUserId, updated_by: auth.actorUserId })));
            if (itemsError) throw itemsError;
        }
        if (invoice.importId) await supabaseAdmin.from("incoming_invoice_imports").update({ status: "completed", updatedAt: now, errorMessage: null }).eq("id", invoice.importId).eq("userId", auth.companyOwnerId);
        await supabaseAdmin.from("incoming_invoice_audit_log").insert({ id: nanoid(), userId: auth.companyOwnerId, invoiceId: id, eventType: "ai_extracted", actorUserId: auth.actorUserId, details: { model: "gpt-4.1-mini", confidence: extracted.confidence, itemCount: extracted.items.length, warnings: extracted.warnings } });
        return NextResponse.json({ invoice: updated, warnings: extracted.warnings, itemCount: extracted.items.length });
    } catch (error) {
        console.error("[IncomingInvoices] AI extraction failed", error);
        await supabaseAdmin.from("incoming_invoices").update({ status: "failed", reviewRequired: true, updatedAt: new Date().toISOString(), updated_by: auth.actorUserId }).eq("id", id).eq("userId", auth.companyOwnerId);
        return NextResponse.json({ error: error instanceof Error ? error.message : "KI-Auslesung konnte nicht abgeschlossen werden." }, { status: 500 });
    }
}
