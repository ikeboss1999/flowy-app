type AttachmentKind = { isInvoice: boolean; uncertain: boolean };

export async function classifyIncomingAttachment(content: Buffer, mimeType: string): Promise<AttachmentKind> {
    if (!process.env.OPENAI_API_KEY) throw new Error("Die KI-Auslesung ist noch nicht konfiguriert.");
    const data = `data:${mimeType};base64,${content.toString("base64")}`;
    const file = mimeType === "application/pdf" ? { type: "input_file", filename: "beleg.pdf", file_data: data } : { type: "input_image", image_url: data };
    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4.1-mini", input: [{ role: "user", content: [file, { type: "input_text", text: "Prüfe, ob dieser Anhang eine oder mehrere Eingangsrechnungen oder Rechnungskorrekturen enthält. Angebote, Auftragsbestätigungen, Lieferscheine, Werbung und Logos sind keine Rechnungen. Bei nicht eindeutiger Zuordnung uncertain=true setzen." }] }], text: { format: { type: "json_schema", name: "incoming_attachment_kind", strict: true, schema: { type: "object", additionalProperties: false, required: ["isInvoice", "uncertain"], properties: { isInvoice: { type: "boolean" }, uncertain: { type: "boolean" } } } } } }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error("Der E-Mail-Anhang konnte nicht auf Rechnungen geprüft werden.");
    const text = payload?.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || []).find((item: { type?: string }) => item.type === "output_text")?.text || payload?.output_text;
    const result = JSON.parse(text || "null");
    if (typeof result?.isInvoice !== "boolean" || typeof result?.uncertain !== "boolean") throw new Error("Die Rechnungserkennung hat kein gültiges Ergebnis geliefert.");
    return result as AttachmentKind;
}
