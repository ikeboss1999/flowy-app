import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAllowed } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function safeFileName(name: string) {
    const extension = name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "";
    const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 90) || "beleg";
    return extension ? `${base}.${extension}` : base;
}

export async function POST(request: Request) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Dateispeicher ist nicht konfiguriert." }, { status: 503 });

    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    if (!isAllowed(`incoming-invoice-upload:${auth.companyOwnerId}:${clientIp}`, 20, 60_000)) {
        return NextResponse.json({ error: "Zu viele Uploads. Bitte kurz warten." }, { status: 429 });
    }

    try {
        const { name, mimeType, size } = await request.json();
        if (typeof name !== "string" || !name.trim() || !Number.isFinite(size) || size <= 0) {
            return NextResponse.json({ error: "Ungültige Upload-Daten." }, { status: 400 });
        }
        if (size > MAX_FILE_SIZE) return NextResponse.json({ error: "Eine Datei darf maximal 25 MB groß sein." }, { status: 400 });
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
            return NextResponse.json({ error: "Erlaubt sind PDF-, JPG-, PNG- und WEBP-Dateien." }, { status: 400 });
        }

        const importId = nanoid();
        const storagePath = `${auth.companyOwnerId}/imports/${importId}/original-${safeFileName(name)}`;
        const { data, error } = await supabaseAdmin.storage.from("incoming-invoices").createSignedUploadUrl(storagePath);
        if (error || !data?.token) throw error || new Error("Upload-URL konnte nicht erstellt werden.");
        return NextResponse.json({ importId, path: storagePath, token: data.token });
    } catch (error) {
        console.error("[IncomingInvoices] upload URL failed", error);
        return NextResponse.json({ error: "Upload konnte nicht vorbereitet werden." }, { status: 500 });
    }
}
