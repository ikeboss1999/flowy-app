import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requireApiSession('projects_files_read');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Storage not configured (missing SUPABASE_SERVICE_ROLE_KEY)' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get('path');

    if (!storagePath) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    // Security: path must start with the requesting user's ID
    if (!storagePath.startsWith(`${userId}/`)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Double-check ownership via DB record (search in either project_files or archive_files)
    let hasAccess = false;

    const { data: fileRecord } = await supabaseAdmin
        .from('project_files')
        .select('id')
        .eq('storagePath', storagePath)
        .eq('userId', userId)
        .maybeSingle();

    if (fileRecord) {
        hasAccess = true;
    } else {
        // Fallback check in archive_files
        const { data: archiveRecord } = await supabaseAdmin
            .from('archive_files')
            .select('id')
            .eq('storagePath', storagePath)
            .eq('userId', userId)
            .maybeSingle();
        if (archiveRecord) {
            hasAccess = true;
        }
    }

    if (!hasAccess) {
        return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 });
    }

    // Generate short-lived signed URL (1 hour max)
    const { data, error } = await supabaseAdmin.storage
        .from('project-files')
        .createSignedUrl(storagePath, 3600, { download: false });

    if (error || !data?.signedUrl) {
        console.error('[SignedURL] Error:', error);
        return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl, expiresIn: 3600 });
}
