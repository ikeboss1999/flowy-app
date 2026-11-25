import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createIncomingMailboxConnection } from "@/lib/incoming-mailbox-connection";
import { classifyPagesForTenant } from "@/app/api/incoming-invoices/classify-pages/service";
import { extractInvoiceForTenant } from "@/app/api/incoming-invoices/[id]/extract/service";
import { createSupplierForInvoice } from "@/app/api/incoming-invoices/[id]/create-supplier/service";
import { classifyIncomingAttachment } from "@/lib/incoming-attachment-classify";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { simpleParser } = require("mailparser") as { simpleParser: (source: Buffer) => Promise<{ attachments: Array<{ filename?: string; contentType: string; content: Buffer; contentDisposition?: string }> }> };

type Mailbox = { userId: string; host: string; port: number; username: string; passwordEncrypted: string; mailbox: string; uidValidity: string | null; lastUid: number | null };
const stableId = (...parts: Array<string | number>) => createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
const allowed = new Map([["application/pdf", "pdf"], ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

function detectAttachmentType(content: Buffer): string | null {
    if (content.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
    if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return "image/jpeg";
    if (content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (content.length >= 12 && content.subarray(0, 4).toString("ascii") === "RIFF" && content.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
    return null;
}

async function processAttachment(mailbox: Mailbox, validity: string, uid: number, index: number, attachment: { filename?: string; contentType: string; content: Buffer }) {
    if (!supabaseAdmin) throw new Error("Datenbank nicht verfügbar.");
    const mimeType = detectAttachmentType(attachment.content);
    const extension = mimeType && allowed.get(mimeType);
    if (!extension || !mimeType) return "unsupported" as const;
    if (attachment.content.length > 25 * 1024 * 1024) throw new Error("Ein E-Mail-Anhang überschreitet 25 MB.");
    const importId = stableId(mailbox.userId, mailbox.host, mailbox.username, mailbox.mailbox, validity, uid, index);
    const { data: prior, error: priorError } = await supabaseAdmin.from("incoming_invoice_mail_parts").select("id").eq("id", importId).eq("userId", mailbox.userId).maybeSingle();
    if (priorError) throw priorError;
    if (prior) return "previous" as const;
    const kind = await classifyIncomingAttachment(attachment.content, mimeType);
    if (!kind.isInvoice && !kind.uncertain) {
        const { error } = await supabaseAdmin.from("incoming_invoice_mail_parts").insert({ id: importId, userId: mailbox.userId, importId });
        if (error && error.code !== "23505") throw error;
        return "not_invoice" as const;
    }
    const rawName = (attachment.filename || "beleg").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-90);
    const safeName = `${rawName.replace(/\.[^.]+$/, "") || "beleg"}.${extension}`;
    const originalPath = `${mailbox.userId}/imports/${importId}/original-${safeName}`;
    const bucket = supabaseAdmin.storage.from("incoming-invoices");
    const { error: storageError } = await bucket.upload(originalPath, attachment.content, { contentType: mimeType, upsert: true });
    if (storageError) throw storageError;
    let groups = [{ from: 1, to: 1 }];
    let pdf: PDFDocument | null = null;
    let uncertain = kind.uncertain;
    if (extension === "pdf") {
        pdf = await PDFDocument.load(attachment.content);
        if (pdf.getPageCount() > 1) {
            const response = await classifyPagesForTenant(originalPath, importId, mailbox.userId);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Seitenerkennung fehlgeschlagen.");
            uncertain = uncertain || result.uncertain;
            groups = uncertain ? [{ from: 1, to: pdf.getPageCount() }] : result.groups;
        }
    }
    const now = new Date().toISOString();
    const fileHash = createHash("sha256").update(attachment.content).digest("hex");
    const { data: duplicate } = await supabaseAdmin.from("incoming_invoice_imports").select("id").eq("userId", mailbox.userId).eq("fileHash", fileHash).neq("id", importId).limit(1).maybeSingle();
    const { error: importError } = await supabaseAdmin.from("incoming_invoice_imports").upsert({ id: importId, userId: mailbox.userId, sourceType: "imap", status: "processing", originalFilePath: originalPath, originalFileName: attachment.filename || safeName, originalMimeType: mimeType, originalFileSize: attachment.content.length, fileHash, pageCount: pdf?.getPageCount() || 1, detectedDocumentCount: groups.length, mailbox: mailbox.mailbox, emailUid: String(uid), updatedAt: now, updated_by: mailbox.userId }, { onConflict: "id" });
    if (importError) throw importError;
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const invoiceId = stableId(importId, i);
        const { data: existing, error: existingError } = await supabaseAdmin.from("incoming_invoices").select("id,status,supplierId,supplierName").eq("id", invoiceId).eq("userId", mailbox.userId).maybeSingle();
        if (existingError) throw existingError;
        if (existing && !["new", "failed", "extracting"].includes(existing.status)) {
            if (!existing.supplierId && existing.supplierName && ["review", "duplicate"].includes(existing.status)) {
                const response = await createSupplierForInvoice(invoiceId, mailbox.userId, mailbox.userId);
                if (!response.ok) throw new Error("Lieferant konnte nicht zugeordnet werden.");
            }
            continue;
        }
        let filePath = originalPath;
        let fileName = safeName;
        if (pdf && groups.length > 1) {
            const part = await PDFDocument.create();
            const pages = await part.copyPages(pdf, Array.from({ length: group.to - group.from + 1 }, (_, offset) => group.from - 1 + offset));
            pages.forEach((page) => part.addPage(page));
            fileName = `Seiten-${group.from}-${group.to}.pdf`;
            filePath = `${mailbox.userId}/imports/${importId}/${fileName}`;
            const { error } = await bucket.upload(filePath, Buffer.from(await part.save()), { contentType: "application/pdf", upsert: true });
            if (error) throw error;
        }
        if (!existing) {
            const { error } = await supabaseAdmin.from("incoming_invoices").insert({ id: invoiceId, userId: mailbox.userId, importId, sourceType: "imap", status: duplicate ? "duplicate" : "new", originalFilePath: filePath, originalFileName: fileName, pageFrom: group.from, pageTo: group.to, isDuplicate: Boolean(duplicate), duplicateReasons: duplicate ? ["Identischer Anhang wurde bereits importiert."] : [], reviewRequired: true, notes: uncertain ? "Der Anhang oder die Seitentrennung konnte nicht sicher erkannt werden. Bitte den vollständigen Originalbeleg kontrollieren." : null, createdAt: now, updatedAt: now, created_by: mailbox.userId, updated_by: mailbox.userId });
            if (error) throw error;
        }
        if (uncertain) continue;
        const response = await extractInvoiceForTenant(invoiceId, mailbox.userId, mailbox.userId);
        if (!response.ok) throw new Error("Ein Beleg konnte nicht ausgelesen werden.");
        const result = await response.json();
        if (result.invoice?.supplierName && !result.invoice?.supplierId) {
            const supplierResponse = await createSupplierForInvoice(invoiceId, mailbox.userId, mailbox.userId);
            if (!supplierResponse.ok) throw new Error("Lieferant konnte nicht zugeordnet werden.");
        }
    }
    const { error: receiptError } = await supabaseAdmin.from("incoming_invoice_mail_parts").insert({ id: importId, userId: mailbox.userId, importId });
    if (receiptError && receiptError.code !== "23505") throw receiptError;
    await supabaseAdmin.from("incoming_invoice_imports").update({ status: "completed", updatedAt: new Date().toISOString() }).eq("id", importId).eq("userId", mailbox.userId);
    return "imported" as const;
}

export async function pollIncomingMailbox(mailbox: Mailbox) {
    if (!supabaseAdmin) throw new Error("Datenbank nicht verfügbar.");
    const client = await createIncomingMailboxConnection(mailbox);
    let imported = 0;
    let attachmentsChecked = 0;
    let previous = 0;
    let notInvoices = 0;
    try {
        await client.connect();
        const selected = await client.mailboxOpen(mailbox.mailbox, { readOnly: true });
        const validity = String(selected.uidValidity);
        if (!mailbox.uidValidity || mailbox.lastUid == null) {
            const { error } = await supabaseAdmin.from("incoming_invoice_mailboxes").update({ uidValidity: validity, lastUid: Math.max(0, selected.uidNext - 1), lastCheckedAt: new Date().toISOString(), lastError: null }).eq("userId", mailbox.userId);
            if (error) throw error;
            return { imported: 0, emailsChecked: 0, attachmentsChecked: 0, previous: 0, notInvoices: 0, initialized: true };
        }
        if (mailbox.uidValidity !== validity) throw new Error("Die Kennung des Postfachs hat sich geändert. Bitte die Verbindung erneut einrichten.");
        const list = await client.search({ uid: `${mailbox.lastUid + 1}:*` }, { uid: true });
        const uids = (Array.isArray(list) ? list : []).filter((uid) => uid > mailbox.lastUid!).sort((a, b) => a - b).slice(0, 10);
        for (const uid of uids) {
            const metadata = await client.fetchOne(String(uid), { uid: true, size: true }, { uid: true });
            if (!metadata) continue;
            if ((metadata.size || 0) > 35 * 1024 * 1024) throw new Error(`E-Mail ${uid} ist größer als 35 MB und muss manuell geprüft werden.`);
            const message = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
            if (!message || !message.source) throw new Error(`E-Mail ${uid} konnte nicht gelesen werden.`);
            const parsed = await simpleParser(message.source);
            for (let i = 0; i < parsed.attachments.length; i++) {
                const attachment = parsed.attachments[i];
                if (attachment.contentDisposition === "inline" && !attachment.filename) continue;
                const result = await processAttachment(mailbox, validity, uid, i, attachment);
                if (result !== "unsupported") attachmentsChecked++;
                if (result === "imported") imported++;
                if (result === "previous") previous++;
                if (result === "not_invoice") notInvoices++;
            }
            const { error } = await supabaseAdmin.from("incoming_invoice_mailboxes").update({ lastUid: uid, lastCheckedAt: new Date().toISOString(), lastError: null }).eq("userId", mailbox.userId);
            if (error) throw error;
        }
        const { error: checkedError } = await supabaseAdmin.from("incoming_invoice_mailboxes").update({ lastCheckedAt: new Date().toISOString(), lastError: null }).eq("userId", mailbox.userId);
        if (checkedError) throw checkedError;
        return { imported, emailsChecked: uids.length, attachmentsChecked, previous, notInvoices, initialized: false };
    } finally { await client.logout().catch(() => client.close()); }
}
