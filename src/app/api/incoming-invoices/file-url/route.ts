import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const auth = await requireApiSession("invoices_read");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Dateispeicher ist nicht konfiguriert." }, { status: 503 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Eingangsrechnung fehlt." }, { status: 400 });

    const { data: invoice, error } = await supabaseAdmin.from("incoming_invoices")
        .select("originalFilePath,originalFileName")
        .eq("id", id)
        .eq("userId", auth.companyOwnerId)
        .maybeSingle();
    if (error || !invoice) return NextResponse.json({ error: "Eingangsrechnung wurde nicht gefunden." }, { status: 404 });
    if (!invoice.originalFilePath.startsWith(`${auth.companyOwnerId}/`)) return NextResponse.json({ error: "Ungültiger Dokumentenpfad." }, { status: 400 });

    const { data, error: signedError } = await supabaseAdmin.storage.from("incoming-invoices")
        .createSignedUrl(invoice.originalFilePath, 300, { download: false });
    if (signedError || !data?.signedUrl) return NextResponse.json({ error: "Dokument konnte nicht geöffnet werden." }, { status: 500 });
    return NextResponse.json({ url: data.signedUrl, name: invoice.originalFileName });
}
