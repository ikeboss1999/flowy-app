import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { requireApiSession } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const auth = await requireApiSession("invoices_write");
    if (!auth.ok) return auth.response;
    const { path, importId } = await request.json();
    return classifyPagesForTenant(path, importId, auth.companyOwnerId);
}

export async function classifyPagesForTenant(path: unknown, importId: unknown, companyOwnerId: string) {
    const auth = { companyOwnerId };
    if (!supabaseAdmin || !process.env.OPENAI_API_KEY) return NextResponse.json({ error: "KI-Auslesung ist nicht konfiguriert." }, { status: 503 });
    try {
        if (typeof importId !== "string" || !/^[A-Za-z0-9_-]+$/.test(importId) || typeof path !== "string" || !path.startsWith(`${auth.companyOwnerId}/imports/${importId}/original-`) || path.includes("..")) return NextResponse.json({ error: "Ungültiger Dateipfad." }, { status: 400 });
        const { data: file, error } = await supabaseAdmin.storage.from("incoming-invoices").download(path);
        if (error || !file) throw new Error("Die PDF konnte nicht geladen werden.");
        if (file.size > 25 * 1024 * 1024) throw new Error("Die PDF ist zu groß.");
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const count = pdf.getPageCount();
        if (count < 1 || count > 100) throw new Error("Die PDF muss zwischen 1 und 100 Seiten enthalten.");
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-4.1-mini", input: [{ role: "user", content: [{ type: "input_file", filename: "beleg.pdf", file_data: `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}` }, { type: "input_text", text: `Analysiere alle ${count} Seiten dieser PDF. Identifiziere zusammenhängende Rechnungen anhand von Rechnungsnummer, Lieferant, Seitenzählung und Inhalt. Gib für jede Rechnung die erste und letzte Seite an. Mehrseitige Rechnungen zusammenlassen. Jede Seite muss genau einmal in der ursprünglichen Reihenfolge enthalten sein. Bei Unsicherheit gib uncertain=true an. Keine Daten erfinden.` }] }], text: { format: { type: "json_schema", name: "invoice_page_groups", strict: true, schema: { type: "object", additionalProperties: false, required: ["groups", "uncertain"], properties: { groups: { type: "array", items: { type: "object", additionalProperties: false, required: ["from", "to"], properties: { from: { type: "integer" }, to: { type: "integer" } } } }, uncertain: { type: "boolean" } } } } } }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error("Die automatische Seitenerkennung ist fehlgeschlagen.");
        const content = payload.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || []).find((item: { type?: string }) => item.type === "output_text")?.text || payload.output_text;
        const result = JSON.parse(content);
        let next = 1;
        if (!Array.isArray(result.groups) || !result.groups.length || result.groups.some((group: { from: number; to: number }) => { const invalid = !Number.isInteger(group.from) || !Number.isInteger(group.to) || group.from !== next || group.to < group.from || group.to > count; next = group.to + 1; return invalid; }) || next !== count + 1) throw new Error("Die Seitenerkennung lieferte keine vollständige Zuordnung.");
        return NextResponse.json({ groups: result.groups, uncertain: result.uncertain, pageCount: count });
    } catch (error) {
        console.error("[IncomingInvoices] page classification failed", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Seitenerkennung fehlgeschlagen." }, { status: 500 });
    }
}
