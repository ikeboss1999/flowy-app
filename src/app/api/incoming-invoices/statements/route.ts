import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
    const auth = await requireApiSession("invoices_read");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbank nicht verfügbar." }, { status: 503 });
    const statementId = new URL(request.url).searchParams.get("fileId");
    if (statementId) {
        const { data, error } = await supabaseAdmin.from("incoming_bank_statements").select("originalFilePath").eq("id", statementId).eq("userId", auth.companyOwnerId).maybeSingle();
        if (error || !data) return NextResponse.json({ error: "Kontoauszug wurde nicht gefunden." }, { status: 404 });
        const signed = await supabaseAdmin.storage.from("incoming-bank-statements").createSignedUrl(data.originalFilePath, 60);
        if (signed.error || !signed.data?.signedUrl) return NextResponse.json({ error: "Kontoauszug konnte nicht geöffnet werden." }, { status: 500 });
        return NextResponse.json({ url: signed.data.signedUrl });
    }
    const [statements, transactions] = await Promise.all([
        supabaseAdmin.from("incoming_bank_statements").select("*").eq("userId", auth.companyOwnerId).order("createdAt", { ascending: false }).limit(100),
        supabaseAdmin.from("incoming_bank_transactions").select("*").eq("userId", auth.companyOwnerId).order("bookingDate", { ascending: false }).limit(2000),
    ]);
    if (statements.error || transactions.error) return NextResponse.json({ error: "Kontoauszüge konnten nicht geladen werden." }, { status: 500 });
    return NextResponse.json({ statements: statements.data || [], transactions: transactions.data || [] });
}

export async function POST(request: Request) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: "Datenbank nicht verfügbar." }, { status: 503 });
    try {
        const body = await request.json();
        if (body.action === "prepare") {
            if (typeof body.name !== "string" || !body.name.toLowerCase().endsWith(".pdf") || !Number.isFinite(body.size) || body.size <= 0 || body.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Bitte eine PDF mit höchstens 25 MB auswählen." }, { status: 400 });
            const id = nanoid();
            const path = `${auth.companyOwnerId}/${id}/original.pdf`;
            const { data, error } = await supabaseAdmin.storage.from("incoming-bank-statements").createSignedUploadUrl(path);
            if (error || !data?.token) throw error || new Error("Upload konnte nicht vorbereitet werden.");
            return NextResponse.json({ id, path, token: data.token });
        }
        if (body.action === "confirm") {
            if (typeof body.transactionId !== "string" || typeof body.invoiceId !== "string") return NextResponse.json({ error: "Ungültige Zuordnung." }, { status: 400 });
            const { error } = await supabaseAdmin.rpc("confirm_incoming_bank_payment", { p_user_id: auth.companyOwnerId, p_transaction_id: body.transactionId, p_invoice_id: body.invoiceId, p_actor_id: auth.actorUserId });
            if (error) return NextResponse.json({ error: error.message || "Zuordnung konnte nicht gespeichert werden." }, { status: 400 });
            return NextResponse.json({ success: true });
        }
        if (body.action !== "process" || typeof body.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(body.id) || body.path !== `${auth.companyOwnerId}/${body.id}/original.pdf` || typeof body.name !== "string") return NextResponse.json({ error: "Ungültige Importdaten." }, { status: 400 });
        if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Die KI-Auslesung ist noch nicht konfiguriert." }, { status: 503 });
        const { data: file, error: downloadError } = await supabaseAdmin.storage.from("incoming-bank-statements").download(body.path);
        if (downloadError || !file) throw new Error("Kontoauszug konnte nicht geladen werden.");
        if (file.size > 25 * 1024 * 1024) throw new Error("Der Kontoauszug ist zu groß.");
        const bytes = Buffer.from(await file.arrayBuffer());
        if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return NextResponse.json({ error: "Die Datei ist keine gültige PDF." }, { status: 400 });
        const hash = createHash("sha256").update(bytes).digest("hex");
        const { data: existing, error: lookupError } = await supabaseAdmin.from("incoming_bank_statements").select("id,status").eq("userId", auth.companyOwnerId).eq("fileHash", hash).maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) return NextResponse.json({ error: "Dieser Kontoauszug wurde bereits hochgeladen.", statementId: existing.id }, { status: 409 });
        const { error: insertError } = await supabaseAdmin.from("incoming_bank_statements").insert({ id: body.id, userId: auth.companyOwnerId, originalFilePath: body.path, originalFileName: body.name.slice(0, 255), fileHash: hash, status: "processing", created_by: auth.actorUserId, updated_by: auth.actorUserId });
        if (insertError) throw insertError;
        try {
            const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4.1-mini", input: [{ role: "user", content: [{ type: "input_file", filename: "kontoauszug.pdf", file_data: `data:application/pdf;base64,${bytes.toString("base64")}` }, { type: "input_text", text: "Lies jede Buchung dieses Kontoauszugs aus, keine Anfangs- oder Endsalden. Ausgaben negativ, Einnahmen positiv. Nur eindeutig erkennbare Werte; unbekannte Felder null. Beträge als Dezimalzahlen, Datumsangaben YYYY-MM-DD. Niemals Werte erfinden." }] }], text: { format: { type: "json_schema", name: "bank_statement", strict: true, schema: { type: "object", additionalProperties: false, required: ["transactions"], properties: { transactions: { type: "array", items: { type: "object", additionalProperties: false, required: ["bookingDate", "description", "counterparty", "iban", "reference", "amount", "currency"], properties: { bookingDate: { type: ["string", "null"] }, description: { type: "string" }, counterparty: { type: ["string", "null"] }, iban: { type: ["string", "null"] }, reference: { type: ["string", "null"] }, amount: { type: "number" }, currency: { type: "string" } } } } } } } } }) });
            const payload = await response.json();
            if (!response.ok) throw new Error("KI-Auslesung des Kontoauszugs fehlgeschlagen.");
            const content = payload.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || []).find((item: { type?: string }) => item.type === "output_text")?.text || payload.output_text;
            const result = JSON.parse(content || "null");
            if (!Array.isArray(result?.transactions) || result.transactions.length > 1000) throw new Error("Die KI hat keine gültige Buchungsliste zurückgegeben.");
            const transactions = result.transactions.map((item: { bookingDate: string | null; description: string; counterparty: string | null; iban: string | null; reference: string | null; amount: number; currency: string }) => {
                if (!Number.isFinite(item.amount) || typeof item.description !== "string" || !/^[A-Z]{3}$/.test(item.currency) || (item.bookingDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(item.bookingDate))) throw new Error("Die KI hat ungültige Buchungsdaten geliefert.");
                return { id: nanoid(), userId: auth.companyOwnerId, statementId: body.id, bookingDate: item.bookingDate, description: item.description.slice(0, 2000), counterparty: item.counterparty, iban: item.iban, reference: item.reference, amount: Math.round(item.amount * 100) / 100, currency: item.currency };
            });
            if (transactions.length) { const { error } = await supabaseAdmin.from("incoming_bank_transactions").insert(transactions); if (error) throw error; }
            const { error } = await supabaseAdmin.from("incoming_bank_statements").update({ status: "review", updatedAt: new Date().toISOString() }).eq("id", body.id).eq("userId", auth.companyOwnerId);
            if (error) throw error;
            return NextResponse.json({ success: true, count: transactions.length });
        } catch (error) {
            await supabaseAdmin.from("incoming_bank_statements").update({ status: "failed", errorMessage: error instanceof Error ? error.message : "Auslesung fehlgeschlagen.", updatedAt: new Date().toISOString() }).eq("id", body.id).eq("userId", auth.companyOwnerId);
            throw error;
        }
    } catch (error) {
        console.error("[IncomingBankStatements]", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Aktion fehlgeschlagen." }, { status: 500 });
    }
}
