import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUserSession, hasPermission } from "@/lib/auth-server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { safeUpsert } from "@/lib/supabase-helper";

export const dynamic = "force-dynamic";
const client = () => supabaseAdmin || supabase;

export async function GET() {
    const session = await getUserSession();
    if (!session?.companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data, error } = await client().from("subcontractor_descriptions").select("*").eq("userId", session.companyOwnerId).order("createdAt", { ascending: false }).limit(500);
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
        let documentNumber = payload.documentNumber as string | undefined;
        if (!documentNumber || documentNumber === "draft" || documentNumber === "Entwurf") {
            const year = new Date().getFullYear();
            const { data: existing } = await client().from("subcontractor_descriptions").select("documentNumber").eq("userId", session.companyOwnerId).like("documentNumber", `LB-${year}-%`);
            const highest = (existing || []).reduce((max, entry: any) => Math.max(max, Number(String(entry.documentNumber || "").split("-").pop()) || 0), 0);
            documentNumber = `LB-${year}-${String(highest + 1).padStart(4, "0")}`;
        }
        const record = { ...payload, documentNumber, id: payload.id && payload.id !== "draft" ? payload.id : nanoid(), userId: session.companyOwnerId, createdAt: payload.createdAt || now, updatedAt: now, created_by: session.userId, updated_by: session.userId };
        const { error } = await safeUpsert(client(), "subcontractor_descriptions", record);
        if (error) throw error;
        return NextResponse.json(record);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save description" }, { status: 500 });
    }
}
