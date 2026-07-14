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

    if (!hasPermission(session, 'dunning_write')) {
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
    const invoiceId = formData.get('invoiceId') as string | null;
    const invoiceNumber = formData.get('invoiceNumber') as string | null;
    const level = formData.get('level') as string | null;

    if (!file || !invoiceId || !invoiceNumber || !level) {
        return NextResponse.json({ error: 'Missing file, invoiceId, invoiceNumber, or level' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: 'PDF too large' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF uploads are allowed' }, { status: 400 });
    }

    const safeInvoiceId = sanitizePathPart(invoiceId);
    const safeInvoiceNumber = sanitizePathPart(invoiceNumber);
    const safeLevel = sanitizePathPart(level);
    const storagePath = `${companyOwnerId}/${safeInvoiceId}/dunning/MA-${safeInvoiceNumber}-STUFE-${safeLevel}-${Date.now()}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
        .from('invoices')
        .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
        console.error('[DunningPDFUpload] Storage upload failed:', uploadError);
        return NextResponse.json({ error: 'PDF upload failed' }, { status: 500 });
    }

    return NextResponse.json({ pdfPath: storagePath });
}
