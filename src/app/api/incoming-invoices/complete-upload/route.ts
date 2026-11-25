import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function isOwnedImportPath(value: unknown, ownerId: string, importId: string): value is string {
    return typeof value === "string" && value.startsWith(`${ownerId}/imports/${importId}/original-`);
}

export async function POST(request: Request) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Dateispeicher ist nicht konfiguriert." }, { status: 503 });

    try {
        const { importId, storagePath, name, mimeType, size, fileHash } = await request.json();
        if (typeof importId !== "string" || !isOwnedImportPath(storagePath, auth.companyOwnerId, importId) ||
            typeof name !== "string" || !name.trim() || !Number.isFinite(size) || size <= 0) {
            return NextResponse.json({ error: "Ungültige Abschlussdaten." }, { status: 400 });
        }

        const slash = storagePath.lastIndexOf("/");
        const folder = storagePath.slice(0, slash);
        const storedName = storagePath.slice(slash + 1);
        const { data: files, error: listError } = await supabaseAdmin.storage.from("incoming-invoices").list(folder, { search: storedName, limit: 10 });
        if (listError) throw listError;
        if (!files?.some((file) => file.name === storedName)) return NextResponse.json({ error: "Die hochgeladene Datei wurde nicht gefunden." }, { status: 400 });

        const now = new Date().toISOString();
        const normalizedHash = typeof fileHash === "string" && /^[a-f0-9]{64}$/i.test(fileHash) ? fileHash.toLowerCase() : null;
        const { data: existingImport } = normalizedHash
            ? await supabaseAdmin.from("incoming_invoice_imports").select("id").eq("userId", auth.companyOwnerId).eq("fileHash", normalizedHash).maybeSingle()
            : { data: null };
        const invoiceId = nanoid();
        const isDuplicate = Boolean(existingImport);

        const { error: importError } = await supabaseAdmin.from("incoming_invoice_imports").insert({
            id: importId,
            userId: auth.companyOwnerId,
            sourceType: "manual_upload",
            status: "uploaded",
            originalFilePath: storagePath,
            originalFileName: name.trim(),
            originalMimeType: mimeType || null,
            originalFileSize: size,
            fileHash: normalizedHash,
            detectedDocumentCount: 1,
            createdAt: now,
            updatedAt: now,
            created_by: auth.actorUserId,
            updated_by: auth.actorUserId,
        });
        if (importError) throw importError;

        const { data: invoice, error: invoiceError } = await supabaseAdmin.from("incoming_invoices").insert({
            id: invoiceId,
            userId: auth.companyOwnerId,
            importId,
            sourceType: "manual_upload",
            status: isDuplicate ? "duplicate" : "new",
            originalFilePath: storagePath,
            originalFileName: name.trim(),
            isDuplicate,
            duplicateReasons: isDuplicate ? ["Identische Datei wurde bereits importiert."] : [],
            reviewRequired: true,
            createdAt: now,
            updatedAt: now,
            created_by: auth.actorUserId,
            updated_by: auth.actorUserId,
        }).select().single();
        if (invoiceError || !invoice) {
            await supabaseAdmin.from("incoming_invoice_imports").delete().eq("id", importId).eq("userId", auth.companyOwnerId);
            throw invoiceError || new Error("Eingangsrechnung konnte nicht angelegt werden.");
        }

        const { error: auditError } = await supabaseAdmin.from("incoming_invoice_audit_log").insert({
            id: nanoid(),
            userId: auth.companyOwnerId,
            invoiceId,
            eventType: isDuplicate ? "duplicate_detected" : "uploaded",
            actorUserId: auth.actorUserId,
            details: { importId, originalFileName: name.trim(), existingImportId: existingImport?.id || null },
        });
        if (auditError) console.warn("[IncomingInvoices] audit log failed", auditError);

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        console.error("[IncomingInvoices] upload completion failed", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Datei konnte nicht als Eingangsrechnung gespeichert werden." }, { status: 500 });
    }
}
