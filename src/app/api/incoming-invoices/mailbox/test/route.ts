import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createIncomingMailboxConnection } from "@/lib/incoming-mailbox-connection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbank nicht verfügbar." }, { status: 503 });
    const { data, error } = await supabaseAdmin.from("incoming_invoice_mailboxes").select("host,port,username,passwordEncrypted,mailbox").eq("userId", auth.companyOwnerId).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Bitte zuerst die IMAP-Einstellungen speichern." }, { status: 400 });
    try {
        const client = await createIncomingMailboxConnection(data);
        try {
            await client.connect();
            await client.mailboxOpen(data.mailbox, { readOnly: true });
            return NextResponse.json({ success: true });
        } finally { await client.logout().catch(() => client.close()); }
    } catch (reason) {
        console.error("[IncomingInvoices] mailbox connection failed", reason instanceof Error ? reason.name : "error");
        return NextResponse.json({ error: "Verbindung zum IMAP-Postfach fehlgeschlagen. Bitte Server, Port, Benutzername, Passwort und Postfachordner prüfen." }, { status: 400 });
    }
}
