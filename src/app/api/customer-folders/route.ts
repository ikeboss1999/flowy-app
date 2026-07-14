import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUserSession, hasPermission } from "@/lib/auth-server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { safeInsert, safeUpdate } from "@/lib/supabase-helper";

export const dynamic = "force-dynamic";

const getClient = () => supabaseAdmin || supabase;

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const customerId = new URL(request.url).searchParams.get("customerId");

    if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    if (!hasPermission(session, "customers_read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { data, error } = await getClient()
            .from("archive_folders")
            .select("*")
            .eq("userId", companyOwnerId)
            .eq("customerId", customerId)
            .order("name", { ascending: true });

        if (error) {
            if (error.code === "42P01" || error.code === "42703" || error.code === "PGRST204") return NextResponse.json([]);
            throw error;
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error("[CustomerFolders] GET failed:", error);
        return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { customerId, name } = await request.json();
        if (!customerId || !name?.trim()) return NextResponse.json({ error: "Missing data" }, { status: 400 });

        const { data, error } = await safeInsert(getClient(), "archive_folders", {
            id: nanoid(),
            userId: companyOwnerId,
            customerId,
            name: name.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            created_by: session.userId,
            updated_by: session.userId,
        });

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error("[CustomerFolders] POST failed:", error);
        return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const id = new URL(request.url).searchParams.get("id");

    if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { name } = await request.json();
        const { data, error } = await safeUpdate(getClient(), "archive_folders", {
            name: name.trim(),
            updatedAt: new Date().toISOString(),
            updated_by: session.userId,
        }, { id, userId: companyOwnerId });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error("[CustomerFolders] PATCH failed:", error);
        return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
    }
}
