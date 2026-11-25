import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { safeUpdate } from "@/lib/supabase-helper";

export const dynamic = "force-dynamic";

const EDITABLE_FIELDS = new Set([
    "supplierId", "supplierName", "supplierVatNumber", "invoiceNumber", "issueDate",
    "servicePeriodFrom", "servicePeriodTo", "currency", "netAmount", "taxAmount",
    "grossAmount", "taxBreakdown", "dueDate", "paymentTerms", "discountPercent",
    "discountDueDate", "discountAmount", "discountedGrossAmount", "iban", "bic",
    "paymentReference", "category", "projectId", "projectName", "notes", "status",
    "reviewRequired", "isDuplicate", "isFlagged", "duplicateOfInvoiceId", "duplicateScore", "duplicateReasons",
]);

export async function GET() {
    const auth = await requireApiSession("invoices_read");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbankverbindung ist nicht konfiguriert." }, { status: 503 });

    const { data, error } = await supabaseAdmin
        .from("incoming_invoices")
        .select("*")
        .eq("userId", auth.companyOwnerId)
        .order("createdAt", { ascending: false })
        .limit(1000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}

export async function PATCH(request: Request) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbankverbindung ist nicht konfiguriert." }, { status: 503 });

    try {
        const payload = await request.json();
        const id = typeof payload?.id === "string" ? payload.id : "";
        if (!id) return NextResponse.json({ error: "Ungültige Eingangsrechnung." }, { status: 400 });

        const changes = Object.fromEntries(
            Object.entries(payload).filter(([key]) => EDITABLE_FIELDS.has(key)),
        );
        if (!Object.keys(changes).length) return NextResponse.json({ error: "Keine zulässige Änderung übermittelt." }, { status: 400 });

        const { data: existing, error: existingError } = await supabaseAdmin
            .from("incoming_invoices")
            .select("status")
            .eq("id", id)
            .eq("userId", auth.companyOwnerId)
            .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) return NextResponse.json({ error: "Eingangsrechnung wurde nicht gefunden." }, { status: 404 });
        const changedFields = Object.keys(changes);
        const isFlagOnlyUpdate = changedFields.length === 1 && changedFields[0] === "isFlagged";
        if (["paid", "rejected"].includes(existing.status) && !isFlagOnlyUpdate) {
            return NextResponse.json({ error: "Abgelehnte oder bezahlte Rechnungen sind abgeschlossen und können nicht mehr verändert werden." }, { status: 409 });
        }

        const updatedAt = new Date().toISOString();
        const decisionUpdate = changes.status === "approved" ? { decisionReason: "Freigegeben", decisionAt: updatedAt, decisionBy: auth.actorUserId } : {};
        const { data, error } = await safeUpdate(supabaseAdmin, "incoming_invoices", {
            ...changes,
            ...decisionUpdate,
            updated_by: auth.actorUserId,
            updatedAt,
        }, { id, userId: auth.companyOwnerId });
        if (error || !data) throw error || new Error("Eingangsrechnung wurde nicht gefunden.");

        await supabaseAdmin.from("incoming_invoice_audit_log").insert({
            id: nanoid(),
            userId: auth.companyOwnerId,
            invoiceId: id,
            eventType: "updated",
            actorUserId: auth.actorUserId,
            details: { fields: Object.keys(changes) },
        });
        return NextResponse.json(data);
    } catch (error) {
        console.error("[IncomingInvoices] update failed", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Eingangsrechnung konnte nicht gespeichert werden." }, { status: 500 });
    }
}
