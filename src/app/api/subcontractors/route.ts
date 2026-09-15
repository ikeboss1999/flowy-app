import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserSession, hasPermission } from "@/lib/auth-server";
import { safeGetCreatedBy, safeUpsert } from "@/lib/supabase-helper";

export const dynamic = "force-dynamic";

async function syncNextNumberSetting(client: any, ownerId: string) {
    try {
        const [{ data: rows }, { data: settings }] = await Promise.all([
            client.from("subcontractors").select("subcontractor_number").eq("userId", ownerId).limit(1000),
            client.from("settings").select("accountSettings").eq("userId", ownerId).maybeSingle(),
        ]);
        if (!settings) return;
        const highest = (rows || []).reduce((max: number, row: any) => {
            const match = String(row?.subcontractor_number || "").match(/(\d+)$/);
            return Math.max(max, match ? Number(match[1]) || 0 : 0);
        }, 0);
        const current = settings.accountSettings?.subcontractorSettings || {};
        const nextNumber = Math.max(1, Number(current.nextNumber) || 1, highest + 1);
        if (nextNumber <= (Number(current.nextNumber) || 1)) return;
        await client.from("settings").update({
            accountSettings: {
                ...(settings.accountSettings || {}),
                subcontractorSettings: { ...current, nextNumber },
            },
        }).eq("userId", ownerId);
    } catch (error) {
        console.warn("[Subcontractors] number setting sync skipped", error);
    }
}

export async function GET() {
    const session = await getUserSession();
    if (!session?.companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("subcontractors").select("*").eq("userId", session.companyOwnerId).order("createdAt", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}

export async function POST(request: Request) {
    const session = await getUserSession();
    if (!session?.companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
        const payload = await request.json();
        const now = new Date().toISOString();
        const client = supabaseAdmin || supabase;
        if (payload.subcontractor_number) {
            let duplicateQuery = client.from("subcontractors").select("id").eq("userId", session.companyOwnerId).eq("subcontractor_number", payload.subcontractor_number);
            if (payload.id) duplicateQuery = duplicateQuery.neq("id", payload.id);
            const { data: duplicate } = await duplicateQuery.maybeSingle();
            if (duplicate) return NextResponse.json({ error: "Diese Subunternehmernummer ist bereits vergeben." }, { status: 409 });
        }
        const existingCreatedBy = payload.id ? await safeGetCreatedBy(client, "subcontractors", payload.id) : null;
        const record = {
            ...payload,
            id: payload.id || nanoid(),
            userId: session.companyOwnerId,
            updatedAt: now,
            createdAt: payload.createdAt || now,
            created_by: existingCreatedBy || session.userId,
            updated_by: session.userId,
        };
        const { error } = await safeUpsert(client, "subcontractors", record);
        if (error) throw error;
        await syncNextNumberSetting(client, session.companyOwnerId);
        return NextResponse.json({ success: true, id: record.id });
    } catch (error) {
        console.error("[Subcontractors] save failed", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save subcontractor" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    if (!session?.companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const client = supabaseAdmin || supabase;
    const { error } = await client.from("subcontractors").delete().eq("id", id).eq("userId", session.companyOwnerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
