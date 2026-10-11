"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { appendAttachmentToPdf } from "@/lib/document-attachment-pdf";

type DocumentKind = "invoice" | "offer";

type Attachment = {
    path?: string;
    mimeType?: string;
};

type DraftAttachmentPdfPreviewProps = {
    kind: DocumentKind;
    documentId: string;
    attachment?: Attachment;
    title: string;
    generateDocumentPdf: () => Promise<Blob>;
    fallback: React.ReactNode;
};

/**
 * Drafts do not have a stored document PDF yet. If a saved draft has an
 * attachment, generate the document PDF locally and append the private
 * attachment from Storage before showing it in the browser PDF viewer.
 */
export async function appendStoredDraftAttachment(
    documentPdf: Blob,
    kind: DocumentKind,
    documentId: string,
    attachment?: Attachment,
) {
    if (!attachment?.path) return documentPdf;

    const response = await fetch(
        `/api/document-attachments?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(documentId)}`,
    );
    if (!response.ok) {
        throw new Error("Der gespeicherte Anhang konnte nicht geladen werden.");
    }

    const { url, mimeType } = await response.json();
    const attachmentResponse = await fetch(url);
    if (!attachmentResponse.ok) {
        throw new Error("Der gespeicherte Anhang konnte nicht geladen werden.");
    }

    return appendAttachmentToPdf(
        documentPdf,
        await attachmentResponse.blob(),
        mimeType || attachment.mimeType || "application/pdf",
    );
}

export function DraftAttachmentPdfPreview({
    kind,
    documentId,
    attachment,
    title,
    generateDocumentPdf,
    fallback,
}: DraftAttachmentPdfPreviewProps) {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!attachment?.path) {
            setPreviewUrl(null);
            setError(null);
            return;
        }

        let cancelled = false;
        let objectUrl: string | null = null;
        setPreviewUrl(null);
        setError(null);

        void (async () => {
            try {
                const documentPdf = await generateDocumentPdf();
                const mergedPdf = await appendStoredDraftAttachment(documentPdf, kind, documentId, attachment);
                objectUrl = URL.createObjectURL(mergedPdf);
                if (cancelled) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                setPreviewUrl(objectUrl);
            } catch (previewError) {
                console.error("[DraftAttachmentPdfPreview]", previewError);
                if (!cancelled) setError("Der Anhang konnte nicht in die Vorschau eingefügt werden.");
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [attachment?.path, attachment?.mimeType, documentId, generateDocumentPdf, kind]);

    if (!attachment?.path) return <>{fallback}</>;

    if (previewUrl) {
        return <iframe src={previewUrl} title={title} className="h-full w-full border-none bg-white" />;
    }

    if (error) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p className="max-w-sm text-sm font-bold text-slate-600">{error}</p>
                <div className="hidden h-0 w-0">{fallback}</div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white text-center text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-bold">Vorschau mit Anhang wird erstellt ...</p>
        </div>
    );
}
