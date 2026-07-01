import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const MAX_PDF_SIZE = 10 * 1024 * 1024;

function sanitizePathPart(value: string) {
    return value
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 80);
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'orders_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid multipart request' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const orderId = formData.get('orderId') as string | null;
    const orderNumber = formData.get('orderNumber') as string | null;
    const previousPdfPath = formData.get('previousPdfPath') as string | null;

    if (!file || !orderId || !orderNumber) {
        return NextResponse.json({ error: 'Missing file, orderId, or orderNumber' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: 'PDF too large' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF uploads are allowed' }, { status: 400 });
    }

    const safeOrderNumber = sanitizePathPart(orderNumber);
    const safeOrderId = sanitizePathPart(orderId);
    const storagePath = `${companyOwnerId}/${safeOrderId}/AU-${safeOrderNumber}-${Date.now()}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
        .from('orders')
        .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
        console.error('[OrderPDFUpload] Storage upload failed:', uploadError);
        return NextResponse.json({ error: 'PDF upload failed' }, { status: 500 });
    }

    if (previousPdfPath && previousPdfPath.startsWith(`${companyOwnerId}/`) && previousPdfPath !== storagePath) {
        const { error: removeError } = await supabaseAdmin.storage
            .from('orders')
            .remove([previousPdfPath]);

        if (removeError) {
            console.warn('[OrderPDFUpload] Could not remove previous PDF:', removeError);
        }
    }

    return NextResponse.json({ pdfPath: storagePath });
}
