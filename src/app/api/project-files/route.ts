import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';
import { isAllowed } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── GET: list files for a project ───────────────────────────────────────────

export async function GET(request: Request) {
    const auth = await requireApiSession('projects_files_read');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
            .from('project_files')
            .select('*')
            .eq('projectId', projectId)
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (e) {
        console.error('[ProjectFiles] GET failed:', e);
        return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }
}

// ─── POST: upload a file ──────────────────────────────────────────────────────

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!isAllowed(`upload-${ip}`, 20, 60 * 1000)) {
        return NextResponse.json({ error: 'Zu viele Dateiuploads. Bitte warten Sie eine Minute.' }, { status: 429 });
    }

    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: 'File uploads require SUPABASE_SERVICE_ROLE_KEY to be configured.' },
            { status: 503 }
        );
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid multipart request' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const folder = formData.get('folder') as string | null;

    if (!file || !projectId || !folder) {
        return NextResponse.json({ error: 'Missing file, projectId, or folder' }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('userId', userId)
        .maybeSingle();

    if (projectError) {
        console.error('[ProjectFiles] Project verification failed:', projectError);
        return NextResponse.json({ error: 'Project verification failed' }, { status: 500 });
    }

    if (!project) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json({ error: `File type "${file.type}" is not allowed.` }, { status: 400 });
    }

    // Sanitize filename: keep extension, replace unsafe chars
    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') ?? '';
    const baseName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 80);
    const sanitizedName = ext ? `${baseName}.${ext}` : baseName;
    const sanitizedFolder = folder.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '_');
    const storagePath = `${userId}/${projectId}/${sanitizedFolder}/${Date.now()}-${sanitizedName}`;

    // Upload to private Supabase Storage bucket
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
        .from('project-files')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
        console.error('[ProjectFiles] Storage upload failed:', uploadError);
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    // Persist metadata to DB
    const { data, error: dbError } = await supabaseAdmin
        .from('project_files')
        .insert({
            projectId,
            userId,
            folder,
            name: file.name,
            storagePath,
            mimeType: file.type,
            size: file.size,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

    if (dbError) {
        // Roll back: remove the uploaded file to avoid orphans
        await supabaseAdmin.storage.from('project-files').remove([storagePath]);
        console.error('[ProjectFiles] DB insert failed:', dbError);
        return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}

// ─── PATCH: update a file ─────────────────────────────────────────────────────

export async function PATCH(request: Request) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const body = await request.json();
        const { name, folder } = body;
        
        const updates: Record<string, any> = {};
        if (name !== undefined) updates.name = name;
        if (folder !== undefined) updates.folder = folder;

        const client = supabaseAdmin || supabase;

        const { data, error } = await client
            .from('project_files')
            .update({
                ...updates,
                updatedAt: new Date().toISOString()
            })
            .eq('id', id)
            .eq('userId', userId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (e) {
        console.error('[ProjectFiles] PATCH failed:', e);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

// ─── DELETE: remove a file ────────────────────────────────────────────────────

export async function DELETE(request: Request) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;

        // Fetch the record first (verify ownership)
        const { data: fileRecord, error: lookupError } = await client
            .from('project_files')
            .select('storagePath, userId')
            .eq('id', id)
            .single();

        if (lookupError || !fileRecord) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        if (fileRecord.userId !== userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Delete from storage
        if (supabaseAdmin) {
            const { error: storageError } = await supabaseAdmin.storage
                .from('project-files')
                .remove([fileRecord.storagePath]);
            if (storageError) {
                console.error('[ProjectFiles] Storage delete failed:', storageError);
                // Continue to delete the metadata even if storage delete fails
            }
        }

        // Delete metadata record
        const { error: dbError } = await client
            .from('project_files')
            .delete()
            .eq('id', id)
            .eq('userId', userId);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[ProjectFiles] DELETE failed:', e);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
