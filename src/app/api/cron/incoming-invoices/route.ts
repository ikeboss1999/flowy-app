import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { runIncomingMailbox } from "@/lib/incoming-mailbox-run";
import { INCOMING_FEATURE_ENABLED } from "@/lib/incoming-feature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
    if (!INCOMING_FEATURE_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!supabaseAdmin) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const { data, error } = await supabaseAdmin.from("incoming_invoice_mailboxes").select("userId").eq("enabled", true).order("lastCheckedAt", { ascending: true, nullsFirst: true }).limit(100);
    if (error) return NextResponse.json({ error: "Mailbox list unavailable" }, { status: 500 });
    let failed = 0;
    const deadline = Date.now() + 270_000;
    let processed = 0;
    for (const mailbox of data || []) {
        if (Date.now() >= deadline) break;
        try { await runIncomingMailbox(mailbox.userId); }
        catch { failed++; }
        processed++;
    }
    return NextResponse.json({ success: failed === 0, processed, failed });
}
