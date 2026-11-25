import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { runIncomingMailbox } from "@/lib/incoming-mailbox-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbank nicht verfügbar." }, { status: 503 });
    try {
        const { action } = await request.json();
        if (action === "disable") {
            const { error } = await supabaseAdmin.from("incoming_invoice_mailboxes").update({ enabled: false }).eq("userId", auth.companyOwnerId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }
        if (action !== "enable" && action !== "sync") return NextResponse.json({ error: "Ungültige Aktion." }, { status: 400 });
        const result = await runIncomingMailbox(auth.companyOwnerId, action === "enable");
        if (action === "enable") {
            const { error } = await supabaseAdmin.from("incoming_invoice_mailboxes").update({ enabled: true }).eq("userId", auth.companyOwnerId);
            if (error) throw error;
        }
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Postfachabruf fehlgeschlagen." }, { status: 500 });
    }
}
