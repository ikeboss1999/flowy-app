import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Decision = "reject" | "duplicate";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbankverbindung ist nicht konfiguriert." }, { status: 503 });

    const { id } = await context.params;
    try {
        const payload = await request.json();
        const decision = payload?.decision as Decision;
        const reason = typeof payload?.reason === "string" ? payload.reason.trim() : "";
        if (!(["reject", "duplicate"] as Decision[]).includes(decision)) return NextResponse.json({ error: "Ungültige Prüfentscheidung." }, { status: 400 });
        if (reason.length < 3) return NextResponse.json({ error: "Bitte geben Sie einen nachvollziehbaren Grund an." }, { status: 400 });

        const { data: invoice, error: invoiceError } = await supabaseAdmin.from("incoming_invoices").select("id, status, duplicateReasons, duplicateOfInvoiceId").eq("id", id).eq("userId", auth.companyOwnerId).maybeSingle();
        if (invoiceError) throw invoiceError;
        if (!invoice) return NextResponse.json({ error: "Eingangsrechnung wurde nicht gefunden." }, { status: 404 });
        if (["paid", "rejected"].includes(invoice.status)) return NextResponse.json({ error: "Diese Rechnung ist bereits abgeschlossen und kann nicht mehr verändert werden." }, { status: 409 });

        const now = new Date().toISOString();
        const update = decision === "reject"
            ? { status: "rejected", reviewRequired: false, decisionReason: reason, decisionAt: now, decisionBy: auth.actorUserId, updatedAt: now, updated_by: auth.actorUserId }
            : { status: "duplicate", reviewRequired: true, isDuplicate: true, duplicateOfInvoiceId: invoice.duplicateOfInvoiceId || null, duplicateReasons: [...(Array.isArray(invoice.duplicateReasons) ? invoice.duplicateReasons : []), reason], decisionReason: reason, decisionAt: now, decisionBy: auth.actorUserId, updatedAt: now, updated_by: auth.actorUserId };
        const { data: updated, error: updateError } = await supabaseAdmin.from("incoming_invoices").update(update).eq("id", id).eq("userId", auth.companyOwnerId).select().single();
        if (updateError || !updated) throw updateError || new Error("Prüfentscheidung konnte nicht gespeichert werden.");
        await supabaseAdmin.from("incoming_invoice_audit_log").insert({ id: nanoid(), userId: auth.companyOwnerId, invoiceId: id, eventType: decision === "reject" ? "rejected" : "duplicate_marked", actorUserId: auth.actorUserId, details: { reason, duplicateOfInvoiceId: invoice.duplicateOfInvoiceId || null } });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("[IncomingInvoices] decision failed", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Prüfentscheidung konnte nicht gespeichert werden." }, { status: 500 });
    }
}
