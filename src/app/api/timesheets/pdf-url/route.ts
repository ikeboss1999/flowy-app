import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

function extractTimesheetStoragePath(value?: string | null) {
    if (!value) return null;
    if (!value.startsWith('http')) return value;

    try {
        const url = new URL(value);
        const publicPrefix = '/storage/v1/object/public/timesheets/';
        const signedPrefix = '/storage/v1/object/sign/timesheets/';
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

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'time_tracking_use')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timesheetId = searchParams.get('id');
    const download = searchParams.get('download') === '1';

    if (!timesheetId) {
        return NextResponse.json({ error: 'Missing timesheet id' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: timesheet, error } = await client
            .from('timesheets')
            .select('*')
            .eq('id', timesheetId)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (error) throw error;
        if (!timesheet) {
            return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
        }
        if (timesheet.status !== 'finalized') {
            return NextResponse.json({ error: 'Draft timesheets do not have a locked PDF' }, { status: 400 });
        }

        const storagePath = extractTimesheetStoragePath(timesheet.pdfUrl);

        if (storagePath) {
            if (!supabaseAdmin) {
                return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
            }
            if (!storagePath.startsWith(`${companyOwnerId}/`)) {
                if (timesheet.pdfUrl?.startsWith('http')) {
                    return NextResponse.json({ url: timesheet.pdfUrl, expiresIn: null });
                }
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            const { data, error: signedError } = await supabaseAdmin.storage
                .from('timesheets')
                .createSignedUrl(storagePath, 3600, { download });

            if (signedError || !data?.signedUrl) {
                console.error('[TimesheetPDFUrl] Signed URL failed:', signedError);
                return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
            }

            return NextResponse.json({ url: data.signedUrl, expiresIn: 3600 });
        }

        if (timesheet.pdfUrl?.startsWith('http')) {
            return NextResponse.json({ url: timesheet.pdfUrl, expiresIn: null });
        }

        return NextResponse.json({ error: 'Timesheet has no stored PDF' }, { status: 404 });
    } catch (e) {
        console.error('[TimesheetPDFUrl] Failed:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
