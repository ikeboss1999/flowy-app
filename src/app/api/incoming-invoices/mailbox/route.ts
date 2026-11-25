import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const settingsSchema = z.object({
    host: z.string().trim().min(1).max(253).regex(/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/),
    port: z.number().int().min(1).max(65535),
    username: z.string().trim().min(1).max(320),
    password: z.string().max(1024).optional(),
    mailbox: z.string().trim().min(1).max(255).default("INBOX"),
});

export async function GET() {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbank nicht verfügbar." }, { status: 503 });
    const { data, error } = await supabaseAdmin.from("incoming_invoice_mailboxes").select('host, port, username, mailbox, enabled, "updatedAt", "lastCheckedAt", "lastError"').eq("userId", auth.companyOwnerId).maybeSingle();
    if (error) return NextResponse.json({ error: "IMAP-Einstellungen konnten nicht geladen werden." }, { status: 500 });
    return NextResponse.json({ settings: data, hasPassword: Boolean(data) });
}

export async function POST(request: Request) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbank nicht verfügbar." }, { status: 503 });
    try {
        const parsed = settingsSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ error: "Bitte gültige IMAP-Zugangsdaten eingeben." }, { status: 400 });
        const { data: existing, error: lookupError } = await supabaseAdmin.from("incoming_invoice_mailboxes").select('"passwordEncrypted",host,port,username,mailbox').eq("userId", auth.companyOwnerId).maybeSingle();
        if (lookupError) throw lookupError;
        const { host, port, username, password, mailbox } = parsed.data;
        if (password && !process.env.ENCRYPTION_KEY) return NextResponse.json({ error: "ENCRYPTION_KEY ist nicht konfiguriert." }, { status: 503 });
        const passwordEncrypted = password ? encrypt(password) : existing?.passwordEncrypted;
        if (!passwordEncrypted) return NextResponse.json({ error: "Bitte ein IMAP-Passwort eingeben." }, { status: 400 });
        const changedMailbox = !existing || existing.host !== host || existing.username !== username || existing.mailbox !== mailbox || existing.port !== port;
        const { error } = await supabaseAdmin.from("incoming_invoice_mailboxes").upsert({ userId: auth.companyOwnerId, host, port, username, passwordEncrypted, mailbox, enabled: false, ...(changedMailbox ? { uidValidity: null, lastUid: null, lastError: null } : {}), updatedAt: new Date().toISOString() }, { onConflict: "userId" });
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[IncomingInvoices] mailbox settings failed", error);
        return NextResponse.json({ error: "IMAP-Einstellungen konnten nicht gespeichert werden." }, { status: 500 });
    }
}
