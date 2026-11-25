import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function numberPart(value: unknown) {
    const match = String(value || "").match(/(\d+)$/);
    return match ? Number(match[1]) || 0 : 0;
}

function sameText(left: unknown, right: unknown) {
    return String(left || "").trim().toLocaleLowerCase("de-AT") === String(right || "").trim().toLocaleLowerCase("de-AT");
}

function optionalText(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function supplierPaymentTerm(paymentTerms: unknown, issueDate: unknown, dueDate: unknown) {
    const terms = optionalText(paymentTerms);
    const normalized = terms?.toLocaleLowerCase("de-AT") || "";
    const matches = [...normalized.matchAll(/(\d{1,3})\s*(?:kalender)?tag(?:e|en)?\b/g)]
        .map((match) => Number(match[1]))
        .filter((days) => Number.isFinite(days) && days >= 0 && days <= 365);
    if (matches.length) return `${Math.max(...matches)} Tage netto`;

    const issue = optionalText(issueDate)?.slice(0, 10);
    const due = optionalText(dueDate)?.slice(0, 10);
    if (issue && due) {
        const difference = Math.round((new Date(`${due}T12:00:00Z`).getTime() - new Date(`${issue}T12:00:00Z`).getTime()) / 86_400_000);
        if (difference >= 0 && difference <= 365) return difference === 0 ? "Sofort netto" : `${difference} Tage netto`;
    }
    return /(?:zahlbar\s+)?(?:sofort|bei|nach)\s+(?:rechnungserhalt|erhalt(?:\s+der\s+rechnung)?)/.test(normalized) ? "Sofort netto" : null;
}

function usableSupplierPaymentTerm(value: unknown) {
    const term = optionalText(value);
    if (!term) return null;
    return /(?:€|\beur\b|\d{1,2}\.\d{1,2}\.\d{4})/i.test(term) ? null : term;
}

function extractedSupplierData(invoice: Record<string, unknown>) {
    const extracted = invoice.extractedData && typeof invoice.extractedData === "object" ? invoice.extractedData as Record<string, unknown> : {};
    const supplier = extracted.supplier && typeof extracted.supplier === "object" ? extracted.supplier as Record<string, unknown> : {};
    return {
        contactPerson: optionalText(supplier.contactPerson),
        email: optionalText(supplier.email),
        phone: optionalText(supplier.phone),
        commercialRegisterNumber: optionalText(supplier.commercialRegisterNumber),
    };
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireApiSession("customers_write");
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    return createSupplierForInvoice(id, auth.companyOwnerId, auth.actorUserId);
}

export async function createSupplierForInvoice(id: string, companyOwnerId: string, actorUserId: string) {
    const auth = { companyOwnerId, actorUserId };
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbankverbindung ist nicht konfiguriert." }, { status: 503 });

    try {
        const { data: invoice, error: invoiceError } = await supabaseAdmin.from("incoming_invoices").select("*").eq("id", id).eq("userId", auth.companyOwnerId).maybeSingle();
        if (invoiceError) throw invoiceError;
        if (!invoice) return NextResponse.json({ error: "Eingangsrechnung wurde nicht gefunden." }, { status: 404 });
        if (!String(invoice.supplierName || "").trim()) return NextResponse.json({ error: "Der Lieferantenname wurde noch nicht erkannt." }, { status: 400 });

        const [{ data: suppliers, error: suppliersError }, { data: settings, error: settingsError }] = await Promise.all([
            supabaseAdmin.from("suppliers").select("*").eq("userId", auth.companyOwnerId).order("supplierNumber").limit(1000),
            supabaseAdmin.from("settings").select("accountSettings").eq("userId", auth.companyOwnerId).maybeSingle(),
        ]);
        if (suppliersError) throw suppliersError;
        if (settingsError) throw settingsError;

        const existing = (suppliers || []).find((supplier) => supplier.id === invoice.supplierId || (invoice.supplierVatNumber
            ? sameText(supplier.vatNumber, invoice.supplierVatNumber)
            : sameText(supplier.name, invoice.supplierName)));
        const now = new Date().toISOString();
        const detected = extractedSupplierData(invoice);
        const normalizedPaymentTerm = supplierPaymentTerm(invoice.paymentTerms, invoice.issueDate, invoice.dueDate);
        if (existing) {
            const enrichment = {
                contactPerson: existing.contactPerson || detected.contactPerson,
                email: existing.email || detected.email,
                phone: existing.phone || detected.phone,
                commercialRegisterNumber: existing.commercialRegisterNumber || detected.commercialRegisterNumber,
                street: existing.street || invoice.supplierAddress?.street || null,
                zip: existing.zip || invoice.supplierAddress?.zip || null,
                city: existing.city || invoice.supplierAddress?.city || null,
                country: existing.country || invoice.supplierAddress?.country || null,
                vatNumber: existing.vatNumber || invoice.supplierVatNumber || null,
                iban: existing.iban || invoice.iban || null,
                bic: existing.bic || invoice.bic || null,
                paymentTermId: usableSupplierPaymentTerm(existing.paymentTermId) || normalizedPaymentTerm,
                defaultCategory: existing.defaultCategory || invoice.category || null,
                updatedAt: now,
                updated_by: auth.actorUserId,
            };
            const { data: enrichedSupplier, error: enrichmentError } = await supabaseAdmin.from("suppliers").update(enrichment).eq("id", existing.id).eq("userId", auth.companyOwnerId).select().single();
            if (enrichmentError) throw enrichmentError;
            const { error: linkError } = await supabaseAdmin.from("incoming_invoices").update({ supplierId: existing.id, updatedAt: now, updated_by: auth.actorUserId }).eq("id", id).eq("userId", auth.companyOwnerId);
            if (linkError) throw linkError;
            return NextResponse.json({ supplier: enrichedSupplier || existing, supplierId: existing.id, created: false });
        }

        const supplierSettings = settings?.accountSettings?.supplierSettings || {};
        const prefix = String(supplierSettings.prefix || "LF-");
        const padding = Math.max(1, Number(supplierSettings.mindestLaenge) || 1);
        const highest = Math.max(0, ...(suppliers || []).map((supplier) => numberPart(supplier.supplierNumber)));
        const nextNumber = Math.max(1, Number(supplierSettings.nextNumber) || 1, highest + 1);
        const supplier = {
            id: nanoid(), userId: auth.companyOwnerId, supplierNumber: `${prefix}${String(nextNumber).padStart(padding, "0")}`,
            name: String(invoice.supplierName).trim(), street: invoice.supplierAddress?.street || null, zip: invoice.supplierAddress?.zip || null, city: invoice.supplierAddress?.city || null, country: invoice.supplierAddress?.country || "Österreich", vatNumber: invoice.supplierVatNumber || null,
            contactPerson: detected.contactPerson, email: detected.email, phone: detected.phone, commercialRegisterNumber: detected.commercialRegisterNumber,
            iban: invoice.iban || null, bic: invoice.bic || null, paymentTermId: normalizedPaymentTerm, defaultCategory: invoice.category || null, status: "active", createdAt: now, updatedAt: now, created_by: auth.actorUserId, updated_by: auth.actorUserId,
        };
        const { error: supplierError } = await supabaseAdmin.from("suppliers").insert(supplier);
        if (supplierError) throw supplierError;
        const { error: linkError } = await supabaseAdmin.from("incoming_invoices").update({ supplierId: supplier.id, updatedAt: now, updated_by: auth.actorUserId }).eq("id", id).eq("userId", auth.companyOwnerId);
        if (linkError) throw linkError;
        if (settings) await supabaseAdmin.from("settings").update({ accountSettings: { ...(settings.accountSettings || {}), supplierSettings: { ...supplierSettings, nextNumber: nextNumber + 1 } } }).eq("userId", auth.companyOwnerId);
        await supabaseAdmin.from("incoming_invoice_audit_log").insert({ id: nanoid(), userId: auth.companyOwnerId, invoiceId: id, eventType: "supplier_created", actorUserId: auth.actorUserId, details: { supplierId: supplier.id, supplierNumber: supplier.supplierNumber } });
        return NextResponse.json({ supplier, supplierId: supplier.id, created: true }, { status: 201 });
    } catch (error) {
        console.error("[IncomingInvoices] supplier creation failed", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Lieferant konnte nicht angelegt werden." }, { status: 500 });
    }
}
