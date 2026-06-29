import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { nanoid } from 'nanoid';
import { safeInsert, safeUpdate } from '@/lib/supabase-helper';

export const dynamic = 'force-dynamic';

const getClient = () => supabaseAdmin || supabase;

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session, 'archive_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { data, error } = await getClient()
            .from('archive_folders')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('name', { ascending: true });

        if (error) {
            if (error.code === '42P01') return NextResponse.json([]);
            throw error;
        }
        return NextResponse.json(data || []);
    } catch (e) {
        console.error('[ArchiveFolders] GET failed:', e);
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Mitarbeiter dürfen im Archiv keine Ordner erstellen
    if (session?.role === 'employee') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { name } = await request.json();
        if (!name) return NextResponse.json({ error: 'Missing folder name' }, { status: 400 });

        const folderId = nanoid();
        const { data, error } = await safeInsert(getClient(), 'archive_folders', {
            id: folderId,
            userId: companyOwnerId,
            name: name.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            created_by: session.userId,
            updated_by: session.userId
        });

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e) {
        console.error('[ArchiveFolders] POST failed:', e);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Mitarbeiter dürfen im Archiv keine Ordner bearbeiten
    if (session?.role === 'employee') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const { name } = await request.json();
        const client = getClient();

        const { data: oldFolder } = await client
            .from('archive_folders')
            .select('name')
            .eq('id', id)
            .single();

        const { data: folder, error: folderError } = await safeUpdate(client, 'archive_folders', {
            name: name.trim(),
            updatedAt: new Date().toISOString(),
            updated_by: session.userId
        }, { id, userId: companyOwnerId });

        if (folderError) throw folderError;

        if (oldFolder) {
            // Cascade update files in this folder
            await safeUpdate(client, 'archive_files', { 
                folder: name.trim(), 
                updated_by: session.userId 
            }, { folder: oldFolder.name, userId: companyOwnerId });
        }

        return NextResponse.json(folder);
    } catch (e) {
        console.error('[ArchiveFolders] PATCH failed:', e);
        return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Mitarbeiter dürfen im Archiv keine Ordner löschen
    if (session?.role === 'employee') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const client = getClient();
        const { data: folder } = await client
            .from('archive_folders')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await client
            .from('archive_folders')
            .delete()
            .eq('id', id)
            .eq('userId', companyOwnerId);

        if (error) throw error;

        // If folder is deleted, we move files inside it to 'Allgemein'
        if (folder) {
            await client
                .from('archive_files')
                .update({ folder: 'Allgemein', updated_by: session.userId })
                .eq('folder', folder.name)
                .eq('userId', companyOwnerId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[ArchiveFolders] DELETE failed:', e);
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }
}

