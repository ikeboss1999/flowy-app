import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeUpsert } from '@/lib/supabase-helper';
import { decrypt } from '@/lib/encryption';
import { sendSmtpMail, verifySmtpConnection } from '@/lib/smtp-client';
import { buildDocumentEmailHtml, htmlToPlainText, sanitizeEmailHtml } from '@/lib/email-html';
import { dunningPdfFileName, invoicePdfFileName, offerPdfFileName, orderPdfFileName } from '@/lib/document-filenames';
import { EmailSendLog } from '@/types/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SendDocumentType = 'offer' | 'invoice' | 'order' | 'dunning';

function extractStoragePath(value?: string | null, bucket = 'offers') {
    if (!value) return null;
    if (!value.startsWith('http')) return value;

    try {
        const url = new URL(value);
        const publicPrefix = `/storage/v1/object/public/${bucket}/`;
        const signedPrefix = `/storage/v1/object/sign/${bucket}/`;
        if (url.pathname.startsWith(publicPrefix)) {
            return decodeURIComponent(url.pathname.slice(publicPrefix.length));
        }
        if (url.pathname.startsWith(signedPrefix)) {
            return decodeURIComponent(url.pathname.slice(signedPrefix.length));
        }
    } catch {
        return null;
    }

    return null;
}

async function getStoredPdfBuffer(record: any, companyOwnerId: string, bucket: string, pdfReference?: string | null) {
    const reference = pdfReference || record.pdfPath || record.pdfUrl;
    const storagePath = extractStoragePath(reference, bucket);

    if (storagePath) {
        if (!supabaseAdmin) throw new Error('Storage ist nicht konfiguriert.');
        if (!storagePath.startsWith(`${companyOwnerId}/`)) throw new Error('PDF Zugriff verweigert.');

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .download(storagePath);

        if (error || !data) {
            console.error('[EmailSend] PDF download failed:', error);
            throw new Error('Gespeicherte Angebots-PDF konnte nicht geladen werden.');
        }

        return Buffer.from(await data.arrayBuffer());
    }

    if (reference?.startsWith('http')) {
        const response = await fetch(reference);
        if (!response.ok) throw new Error('Gespeicherte Angebots-PDF konnte nicht geladen werden.');
        return Buffer.from(await response.arrayBuffer());
    }

    throw new Error('Bitte finalisieren Sie das Dokument zuerst, damit eine fixe PDF versendet werden kann.');
}

function requireDelivery(settings: any) {
    const delivery = settings?.accountSettings?.emailDelivery || {};
    const password = decrypt(delivery.smtpPasswordEncrypted || '');

    if (!delivery.smtpHost || !delivery.smtpPort || !delivery.smtpUser || !password || !delivery.fromEmail) {
        throw new Error('E-Mail Versand ist noch nicht vollständig eingerichtet.');
    }

    return { ...delivery, smtpPassword: password };
}

function documentPermission(documentType: SendDocumentType) {
    if (documentType === 'offer') return 'offers_write';
    if (documentType === 'invoice') return 'invoices_write';
    if (documentType === 'order') return 'orders_write';
    return 'dunning_write';
}

async function loadDocumentForEmail(client: any, documentType: SendDocumentType, documentId: string, payload: any, companyOwnerId: string) {
    if (documentType === 'offer') {
        const { data: offer, error } = await client
            .from('offers')
            .select('*')
            .eq('id', documentId)
            .eq('userId', companyOwnerId)
            .maybeSingle();
        if (error) throw error;
        if (!offer) throw new Error('Offer not found');
        return {
            record: offer,
            customerId: offer.customerId,
            documentNumber: offer.offerNumber,
            pdfBuffer: await getStoredPdfBuffer(offer, companyOwnerId, 'offers'),
            fileName: (customerName: string) => offerPdfFileName({ ...offer, customerName }),
        };
    }

    if (documentType === 'invoice' || documentType === 'dunning') {
        const { data: invoice, error } = await client
            .from('invoices')
            .select('*')
            .eq('id', documentId)
            .eq('userId', companyOwnerId)
            .maybeSingle();
        if (error) throw error;
        if (!invoice) throw new Error('Invoice not found');

        if (documentType === 'dunning') {
            const level = Number(payload.level || 0);
            const date = String(payload.date || '');
            const history = Array.isArray(invoice.dunningHistory) ? invoice.dunningHistory : [];
            const entry = history.find((item: any) => Number(item.level) === level && (!date || item.date === date));
            if (!entry?.pdfPath && !entry?.pdfUrl) throw new Error('Gespeicherte Mahnungs-PDF konnte nicht gefunden werden.');
            return {
                record: invoice,
                customerId: invoice.customerId,
                documentNumber: `${invoice.invoiceNumber} / Mahnstufe ${level}`,
                pdfBuffer: await getStoredPdfBuffer(invoice, companyOwnerId, 'invoices', entry.pdfPath || entry.pdfUrl),
                fileName: (customerName: string) => dunningPdfFileName({ ...invoice, customerName }, level),
            };
        }

        return {
            record: invoice,
            customerId: invoice.customerId,
            documentNumber: invoice.invoiceNumber,
            pdfBuffer: await getStoredPdfBuffer(invoice, companyOwnerId, 'invoices'),
            fileName: (customerName: string) => invoicePdfFileName({ ...invoice, customerName }),
        };
    }

    const { data: order, error } = await client
        .from('order_confirmations')
        .select('*')
        .eq('id', documentId)
        .eq('userId', companyOwnerId)
        .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error('Order not found');
    return {
        record: order,
        customerId: order.customerId,
        documentNumber: order.orderNumber,
        pdfBuffer: await getStoredPdfBuffer(order, companyOwnerId, 'orders'),
        fileName: (customerName: string) => orderPdfFileName({ ...order, customerName }),
    };
}

async function appendLog(client: any, settings: any, settingsUserId: string, log: EmailSendLog) {
    const accountSettings = settings?.accountSettings || {};
    const currentLogs = Array.isArray(accountSettings.emailSendLogs) ? accountSettings.emailSendLogs : [];
    const updatedSettings = {
        ...settings,
        userId: settingsUserId,
        updatedAt: new Date().toISOString(),
        accountSettings: {
            ...accountSettings,
            emailSendLogs: [log, ...currentLogs].slice(0, 300),
        },
    };

    const { error } = await safeUpsert(client, 'settings', updatedSettings);
    if (error) console.error('[EmailSend] Failed to append log:', error);
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const settingsUserId = session?.userId;

    if (!companyOwnerId || !settingsUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = supabaseAdmin || supabase;
    let emailSettings: any = null;
    let logBase: Omit<EmailSendLog, 'id' | 'status' | 'sentAt' | 'errorMessage'> | null = null;

    try {
        const payload = await request.json();

        const { data: emailSettingsRow, error: emailSettingsError } = await client
            .from('settings')
            .select('*')
            .eq('userId', settingsUserId)
            .maybeSingle();

        if (emailSettingsError) throw emailSettingsError;
        emailSettings = emailSettingsRow || { userId: settingsUserId, accountSettings: {} };
        const delivery = requireDelivery(emailSettings);

        if (payload.mode === 'connection-test') {
            await verifySmtpConnection({
                host: delivery.smtpHost,
                port: Number(delivery.smtpPort),
                security: delivery.smtpSecurity || 'starttls',
                username: delivery.smtpUser,
                password: delivery.smtpPassword,
            });
            return NextResponse.json({ success: true });
        }

        const { data: companySettings, error: companySettingsError } = await client
            .from('settings')
            .select('companyData')
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (companySettingsError) throw companySettingsError;

        if (payload.mode === 'test') {
            const signatureHtml = sanitizeEmailHtml(delivery.signatureHtml || '');
            const text = `Diese Testmail wurde erfolgreich aus FlowY gesendet.\n\n${htmlToPlainText(signatureHtml || delivery.signature || '')}`.trim();
            await sendSmtpMail({
                host: delivery.smtpHost,
                port: Number(delivery.smtpPort),
                security: delivery.smtpSecurity || 'starttls',
                username: delivery.smtpUser,
                password: delivery.smtpPassword,
                fromName: delivery.fromName || companySettings?.companyData?.companyName || 'FlowY',
                fromEmail: delivery.fromEmail,
                replyToEmail: delivery.replyToEmail || delivery.fromEmail,
                to: [delivery.fromEmail],
                subject: 'FlowY Testmail',
                text,
                html: buildDocumentEmailHtml('Diese Testmail wurde erfolgreich aus FlowY gesendet.', signatureHtml || undefined),
            });
            return NextResponse.json({ success: true });
        }

        const documentType = String(payload.documentType || '') as SendDocumentType;
        if (!['offer', 'invoice', 'order', 'dunning'].includes(documentType)) {
            return NextResponse.json({ error: 'Document type not supported' }, { status: 400 });
        }
        if (!hasPermission(session, documentPermission(documentType))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const documentId = String(payload.documentId || '');
        const subject = String(payload.subject || '').trim();
        const message = String(payload.message || '').trim();

        if (!documentId) return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
        if (!subject || !message) return NextResponse.json({ error: 'Missing subject or message' }, { status: 400 });

        const documentData = await loadDocumentForEmail(client, documentType, documentId, payload, companyOwnerId);

        const { data: customer, error: customerError } = await client
            .from('customers')
            .select('*')
            .eq('id', documentData.customerId)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (customerError) throw customerError;
        if (!customer?.email) return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 });

        const customerName = customer.name || documentData.record.customerName || 'Kunde';
        const signatureHtml = sanitizeEmailHtml(delivery.signatureHtml || '');
        const signatureText = htmlToPlainText(signatureHtml || delivery.signature || '');
        const messageText = [message, signatureText].filter(Boolean).join('\n\n');

        logBase = {
            documentType,
            documentId,
            documentNumber: documentData.documentNumber,
            recipient: customer.email,
            subject,
            sentBy: session.userId,
        };

        await sendSmtpMail({
            host: delivery.smtpHost,
            port: Number(delivery.smtpPort),
            security: delivery.smtpSecurity || 'starttls',
            username: delivery.smtpUser,
            password: delivery.smtpPassword,
            fromName: delivery.fromName || companySettings?.companyData?.companyName || 'FlowY',
            fromEmail: delivery.fromEmail,
            replyToEmail: delivery.replyToEmail || delivery.fromEmail,
            to: [customer.email],
            subject,
            text: messageText,
            html: buildDocumentEmailHtml(message, signatureHtml || undefined),
            attachments: [{
                filename: documentData.fileName(customerName),
                contentType: 'application/pdf',
                content: documentData.pdfBuffer,
            }],
        });

        await appendLog(client, emailSettings, settingsUserId, {
            id: nanoid(),
            ...logBase,
            status: 'success',
            sentAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('[EmailSend] Failed:', e);

        if (emailSettings && logBase) {
            await appendLog(client, emailSettings, settingsUserId, {
                id: nanoid(),
                ...logBase,
                status: 'error',
                errorMessage: e?.message || 'Unknown error',
                sentAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({ error: e?.message || 'Failed to send email' }, { status: 500 });
    }
}
