import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession } from '@/lib/auth-server';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const getClient = () => supabaseAdmin || supabase;

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await getClient()
            .from('archive_files')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) {
            if (error.code === '42P01') return NextResponse.json([]);
            throw error;
        }
        return NextResponse.json(data || []);
    } catch (e) {
        console.error('[ArchiveFiles] GET failed:', e);
        return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const folder = (formData.get('folder') as string) || 'Allgemein';

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json({ error: `File type "${file.type}" is not allowed.` }, { status: 400 });
        }

        // Sanitize filename
        const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') ?? '';
        const baseName = file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 80);
        const sanitizedName = ext ? `${baseName}.${ext}` : baseName;
        const sanitizedFolder = folder.toLowerCase()
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]/g, '_');

        const storagePath = `${userId}/archive/${sanitizedFolder}/${Date.now()}-${sanitizedName}`;

        // Upload to project-files bucket in archive subfolder
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await getClient().storage
            .from('project-files')
            .upload(storagePath, buffer, { contentType: file.type, upsert: false });

        if (uploadError) {
            console.error('[ArchiveFiles] Storage upload failed:', uploadError);
            return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
        }

        // Insert metadata
        const fileId = nanoid();
        const { data, error: dbError } = await getClient()
            .from('archive_files')
            .insert({
                id: fileId,
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
            // Cleanup storage on error
            await getClient().storage.from('project-files').remove([storagePath]);
            console.error('[ArchiveFiles] DB insert failed:', dbError);
            return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (e) {
        console.error('[ArchiveFiles] POST failed:', e);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const updates = await request.json();
        const client = getClient();

        const { data, error } = await client
            .from('archive_files')
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
        console.error('[ArchiveFiles] PATCH failed:', e);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const client = getClient();
        const { data: file, error: fetchError } = await client
            .from('archive_files')
            .select('storagePath')
            .eq('id', id)
            .eq('userId', userId)
            .single();

        if (fetchError || !file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Delete DB record
        const { error: dbError } = await client
            .from('archive_files')
            .delete()
            .eq('id', id)
            .eq('userId', userId);

        if (dbError) throw dbError;

        // Delete from storage
        await getClient().storage.from('project-files').remove([file.storagePath]);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[ArchiveFiles] DELETE failed:', e);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
