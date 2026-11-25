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
            client.from("suppliers").select("supplierNumber").eq("userId", ownerId).limit(1000),
            client.from("settings").select("accountSettings").eq("userId", ownerId).maybeSingle(),
        ]);
        if (!settings) return;
        const highest = (rows || []).reduce((max: number, row: any) => {
            const match = String(row?.supplierNumber || "").match(/(\d+)$/);
            return Math.max(max, match ? Number(match[1]) || 0 : 0);
        }, 0);
        const current = settings.accountSettings?.supplierSettings || {};
        const nextNumber = Math.max(1, Number(current.nextNumber) || 1, highest + 1);
        if (nextNumber <= (Number(current.nextNumber) || 1)) return;
        await client.from("settings").update({
            accountSettings: {
                ...(settings.accountSettings || {}),
                supplierSettings: { ...current, nextNumber },
            },
        }).eq("userId", ownerId);
    } catch (error) {
        console.warn("[Suppliers] number setting sync skipped", error);
    }
}

export async function GET() {
    const session = await getUserSession();
    if (!session?.companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from("suppliers").select("*").eq("userId", session.companyOwnerId).order("supplierNumber", { ascending: true }).limit(1000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}

export async function POST(request: Request) {
    const session = await getUserSession();
    if (!session?.companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
        const payload = await request.json();
        const name = String(payload?.name || "").trim();
        const supplierNumber = String(payload?.supplierNumber || "").trim();
        if (!name || !supplierNumber) return NextResponse.json({ error: "Lieferantenname und Lieferantennummer sind erforderlich." }, { status: 400 });
        const client = supabaseAdmin || supabase;
        let duplicateQuery = client.from("suppliers").select("id").eq("userId", session.companyOwnerId).eq("supplierNumber", supplierNumber);
        if (payload.id) duplicateQuery = duplicateQuery.neq("id", payload.id);
        const { data: duplicate } = await duplicateQuery.maybeSingle();
        if (duplicate) return NextResponse.json({ error: "Diese Lieferantennummer ist bereits vergeben." }, { status: 409 });

        const now = new Date().toISOString();
        const existingCreatedBy = payload.id ? await safeGetCreatedBy(client, "suppliers", payload.id) : null;
        const record = {
            ...payload,
            id: payload.id || nanoid(),
            name,
            supplierNumber,
            userId: session.companyOwnerId,
            status: ["active", "inactive", "blocked"].includes(payload.status) ? payload.status : "active",
            createdAt: payload.createdAt || now,
            updatedAt: now,
            created_by: existingCreatedBy || session.userId,
            updated_by: session.userId,
        };
        const { error } = await safeUpsert(client, "suppliers", record);
        if (error) throw error;
        await syncNextNumberSetting(client, session.companyOwnerId);
        return NextResponse.json({ success: true, id: record.id });
    } catch (error) {
        console.error("[Suppliers] save failed", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Lieferant konnte nicht gespeichert werden." }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    if (!session?.companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const client = supabaseAdmin || supabase;
    const { error } = await client.from("suppliers").delete().eq("id", id).eq("userId", session.companyOwnerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
