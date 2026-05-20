import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession } from '@/lib/auth-server';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

const getClient = () => supabaseAdmin || supabase;

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await getClient()
            .from('archive_folders')
            .select('*')
            .eq('userId', userId)
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
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name } = await request.json();
        if (!name) return NextResponse.json({ error: 'Missing folder name' }, { status: 400 });

        const folderId = nanoid();
        const { data, error } = await getClient()
            .from('archive_folders')
            .insert({
                id: folderId,
                userId,
                name: name.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e) {
        console.error('[ArchiveFolders] POST failed:', e);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
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
        const { name } = await request.json();
        const client = getClient();

        const { data: oldFolder } = await client
            .from('archive_folders')
            .select('name')
            .eq('id', id)
            .single();

        const { data: folder, error: folderError } = await client
            .from('archive_folders')
            .update({ name: name.trim(), updatedAt: new Date().toISOString() })
            .eq('id', id)
            .eq('userId', userId)
            .select()
            .single();

        if (folderError) throw folderError;

        if (oldFolder) {
            // Cascade update files in this folder
            await client
                .from('archive_files')
                .update({ folder: name.trim() })
                .eq('folder', oldFolder.name)
                .eq('userId', userId);
        }

        return NextResponse.json(folder);
    } catch (e) {
        console.error('[ArchiveFolders] PATCH failed:', e);
        return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
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
        const { data: folder } = await client
            .from('archive_folders')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await client
            .from('archive_folders')
            .delete()
            .eq('id', id)
            .eq('userId', userId);

        if (error) throw error;

        // If folder is deleted, we move files inside it to 'Allgemein'
        if (folder) {
            await client
                .from('archive_files')
                .update({ folder: 'Allgemein' })
                .eq('folder', folder.name)
                .eq('userId', userId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[ArchiveFolders] DELETE failed:', e);
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }
}
