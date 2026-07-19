import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUserSession, hasPermission } from "@/lib/auth-server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAllowed } from "@/lib/rate-limit";
import { safeInsert } from "@/lib/supabase-helper";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const getClient = () => supabaseAdmin || supabase;

async function verifyCustomerAccess(customerId: string, companyOwnerId: string) {
    const { data, error } = await getClient()
        .from("customers")
        .select("id")
        .eq("id", customerId)
        .eq("userId", companyOwnerId)
        .maybeSingle();

    if (error) throw error;
    return !!data;
}

function sanitizePart(value: string) {
    return value
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9._-]/g, "_")
        .slice(0, 90);
}

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const customerId = new URL(request.url).searchParams.get("customerId");

    if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    if (!hasPermission(session, "customers_read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { data, error } = await getClient()
            .from("archive_files")
            .select("*")
            .eq("userId", companyOwnerId)
            .eq("customerId", customerId)
            .order("createdAt", { ascending: false });

        if (error) {
            if (error.code === "42P01" || error.code === "42703" || error.code === "PGRST204") return NextResponse.json([]);
            throw error;
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error("[CustomerFiles] GET failed:", error);
        return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    if (!isAllowed(`customer-upload-${ip}`, 20, 60 * 1000)) {
        return NextResponse.json({ error: "Zu viele Dateiuploads. Bitte warten Sie eine Minute." }, { status: 429 });
    }

    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const customerId = String(formData.get("customerId") || "");
        const folder = String(formData.get("folder") || "Allgemein");

        if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json({ error: `File type "${file.type}" is not allowed.` }, { status: 400 });
        }

        const canAccessCustomer = await verifyCustomerAccess(customerId, companyOwnerId);
        if (!canAccessCustomer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
        const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const sanitizedName = ext ? `${baseName}.${ext}` : baseName;
        const storagePath = `${companyOwnerId}/customers/${sanitizePart(customerId)}/${sanitizePart(folder)}/${Date.now()}-${sanitizedName}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await getClient().storage
            .from("project-files")
            .upload(storagePath, buffer, { contentType: file.type, upsert: false });

        if (uploadError) {
            console.error("[CustomerFiles] Storage upload failed:", uploadError);
            return NextResponse.json({ error: "File upload failed" }, { status: 500 });
        }

        const { data, error: dbError } = await safeInsert(getClient(), "archive_files", {
            id: nanoid(),
            userId: companyOwnerId,
            customerId,
            folder,
            name: file.name,
            storagePath,
            mimeType: file.type,
            size: file.size,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            created_by: session.userId,
            updated_by: session.userId,
        });

        if (dbError) {
            await getClient().storage.from("project-files").remove([storagePath]);
            throw dbError;
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error("[CustomerFiles] POST failed:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const id = new URL(request.url).searchParams.get("id");

    if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!hasPermission(session, "customers_write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const client = getClient();
        const { data: file, error: fetchError } = await client
            .from("archive_files")
            .select("storagePath")
            .eq("id", id)
            .eq("userId", companyOwnerId)
            .single();

        if (fetchError || !file) return NextResponse.json({ error: "File not found" }, { status: 404 });

        const { error: dbError } = await client
            .from("archive_files")
            .delete()
            .eq("id", id)
            .eq("userId", companyOwnerId);

        if (dbError) throw dbError;
        await client.storage.from("project-files").remove([file.storagePath]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[CustomerFiles] DELETE failed:", error);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
