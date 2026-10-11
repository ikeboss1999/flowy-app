import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserSession, hasPermission } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const documents = {
  invoice: { table: "invoices", bucket: "invoices", read: "invoices_read", write: "invoices_write" },
  offer: { table: "offers", bucket: "offers", read: "offers_read", write: "offers_write" },
} as const;

type DocumentKind = keyof typeof documents;

function getDocument(kind: string | null): { kind: DocumentKind; config: typeof documents[DocumentKind] } | null {
  if (kind !== "invoice" && kind !== "offer") return null;
  return { kind, config: documents[kind] };
}

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "";
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 90) || "anhang";
  return extension ? `${base}.${extension}` : base;
}

function normalizeDisplayName(value: string | null, originalName: string) {
  const candidate = (value || originalName).trim().replace(/[\\/]/g, "_").slice(0, 255) || originalName;
  const extension = originalName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  if (!extension || candidate.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) return candidate;
  return `${candidate.replace(/\.[^.]+$/, "")}.${extension}`;
}

function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
}

export async function POST(request: Request) {
  const session = await getUserSession();
  const companyOwnerId = session?.companyOwnerId;
  if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const formData = await request.formData().catch(() => null);
  const kindEntry = getDocument(formData?.get("kind")?.toString() || null);
  const documentId = formData?.get("documentId")?.toString();
  const requestedName = formData?.get("displayName")?.toString() || null;
  const file = formData?.get("file");
  if (!kindEntry || !documentId || !(file instanceof File)) return NextResponse.json({ error: "Ungültige Anhangsdaten." }, { status: 400 });
  if (!hasPermission(session, kindEntry.config.write)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Der Anhang darf maximal 10 MB groß sein." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Erlaubt sind nur PDF-, PNG- und JPG-Dateien." }, { status: 400 });

  const displayName = normalizeDisplayName(requestedName, file.name);
  const path = `${companyOwnerId}/${safePathPart(documentId)}/attachments/${Date.now()}-${safeFileName(displayName)}`;
  const { error } = await supabaseAdmin.storage.from(kindEntry.config.bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[DocumentAttachments] upload failed", error);
    return NextResponse.json({ error: "Der Anhang konnte nicht hochgeladen werden." }, { status: 500 });
  }

  return NextResponse.json({ name: displayName, path, mimeType: file.type, size: file.size });
}

export async function GET(request: Request) {
  const session = await getUserSession();
  const companyOwnerId = session?.companyOwnerId;
  if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const kindEntry = getDocument(searchParams.get("kind"));
  const documentId = searchParams.get("id");
  if (!kindEntry || !documentId) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  if (!hasPermission(session, kindEntry.config.read)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: document, error } = await supabaseAdmin
    .from(kindEntry.config.table)
    .select("attachmentPath,attachmentName,attachmentMimeType")
    .eq("id", documentId)
    .eq("userId", companyOwnerId)
    .maybeSingle();
  if (error) throw error;
  if (!document?.attachmentPath || !String(document.attachmentPath).startsWith(`${companyOwnerId}/`)) {
    return NextResponse.json({ error: "Kein Anhang vorhanden." }, { status: 404 });
  }

  const { data, error: signedError } = await supabaseAdmin.storage
    .from(kindEntry.config.bucket)
    .createSignedUrl(document.attachmentPath, 300, { download: false });
  if (signedError || !data?.signedUrl) return NextResponse.json({ error: "Der Anhang konnte nicht geladen werden." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, name: document.attachmentName, mimeType: document.attachmentMimeType });
}

export async function DELETE(request: Request) {
  const session = await getUserSession();
  const companyOwnerId = session?.companyOwnerId;
  if (!companyOwnerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const kindEntry = getDocument(searchParams.get("kind"));
  const path = searchParams.get("path");
  if (!kindEntry || !path || !path.startsWith(`${companyOwnerId}/`) || !path.includes("/attachments/")) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!hasPermission(session, kindEntry.config.write)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await supabaseAdmin.storage.from(kindEntry.config.bucket).remove([path]);
  if (error) return NextResponse.json({ error: "Der bisherige Anhang konnte nicht entfernt werden." }, { status: 500 });
  return NextResponse.json({ success: true });
}
