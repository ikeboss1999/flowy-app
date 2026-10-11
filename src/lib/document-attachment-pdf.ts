import { PDFDocument } from "pdf-lib";

export const DOCUMENT_ATTACHMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg";
export const DOCUMENT_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

export type DocumentAttachmentMeta = {
  name: string;
  path: string;
  mimeType: string;
  size: number;
};

export function isSupportedDocumentAttachment(file: Pick<File, "name" | "type">) {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf"
    || file.type === "image/png"
    || file.type === "image/jpeg"
    || name.endsWith(".pdf")
    || name.endsWith(".png")
    || name.endsWith(".jpg")
    || name.endsWith(".jpeg");
}

export async function appendAttachmentToPdf(documentPdf: Blob, attachment: Blob, mimeType: string) {
  const target = await PDFDocument.load(await documentPdf.arrayBuffer());
  const normalizedType = mimeType.toLowerCase();

  if (normalizedType === "application/pdf") {
    const source = await PDFDocument.load(await attachment.arrayBuffer());
    const pages = await target.copyPages(source, source.getPageIndices());
    pages.forEach((page) => target.addPage(page));
  } else {
    const image = normalizedType === "image/png"
      ? await target.embedPng(await attachment.arrayBuffer())
      : await target.embedJpg(await attachment.arrayBuffer());
    const page = target.addPage([595.28, 841.89]);
    const margin = 36;
    const maxWidth = page.getWidth() - margin * 2;
    const maxHeight = page.getHeight() - margin * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: (page.getWidth() - width) / 2,
      y: (page.getHeight() - height) / 2,
      width,
      height,
    });
  }

  const bytes = await target.save();
  const output = new Uint8Array(bytes);
  return new Blob([output.buffer as ArrayBuffer], { type: "application/pdf" });
}
