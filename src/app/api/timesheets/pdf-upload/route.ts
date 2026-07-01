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

    if (!hasPermission(session, 'time_tracking_use')) {
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
    const timesheetId = formData.get('timesheetId') as string | null;
    const employeeName = formData.get('employeeName') as string | null;
    const month = formData.get('month') as string | null;
    const previousPdfPath = formData.get('previousPdfPath') as string | null;

    if (!file || !timesheetId || !employeeName || !month) {
        return NextResponse.json({ error: 'Missing file, timesheetId, employeeName, or month' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: 'PDF too large' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF uploads are allowed' }, { status: 400 });
    }

    const safeTimesheetId = sanitizePathPart(timesheetId);
    const safeEmployeeName = sanitizePathPart(employeeName);
    const safeMonth = sanitizePathPart(month);
    const storagePath = `${companyOwnerId}/${safeTimesheetId}/Stundenzettel-${safeEmployeeName}-${safeMonth}-${Date.now()}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
        .from('timesheets')
        .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
        console.error('[TimesheetPDFUpload] Storage upload failed:', uploadError);
        return NextResponse.json({ error: 'PDF upload failed' }, { status: 500 });
    }

    if (previousPdfPath && previousPdfPath.startsWith(`${companyOwnerId}/`) && previousPdfPath !== storagePath) {
        const { error: removeError } = await supabaseAdmin.storage
            .from('timesheets')
            .remove([previousPdfPath]);

        if (removeError) {
            console.warn('[TimesheetPDFUpload] Could not remove previous PDF:', removeError);
        }
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from('timesheets')
        .createSignedUrl(storagePath, 3600, { download: false });

    if (signedError || !signedData?.signedUrl) {
        console.error('[TimesheetPDFUpload] Signed URL failed:', signedError);
        return NextResponse.json({ error: 'PDF uploaded, but signed URL failed', pdfPath: storagePath }, { status: 500 });
    }

    return NextResponse.json({
        pdfPath: storagePath,
        signedUrl: signedData.signedUrl,
        expiresIn: 3600,
    });
}
