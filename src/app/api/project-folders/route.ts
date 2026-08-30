import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

function normalizeFolderName(value: unknown) {
    if (typeof value !== 'string') return null;
    const name = value.trim();
    if (!name || name.length > 500 || name.startsWith('/') || name.endsWith('/') || name.includes('//')) return null;
    if (name.split('/').includes('..')) return null;
    return name;
}

async function verifyProject(client: any, projectId: string, userId: string) {
    const { data, error } = await client
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('userId', userId)
        .maybeSingle();
    if (error) throw error;
    return !!data;
}

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
            .from('project_folders')
            .select('*')
            .eq('projectId', projectId)
            .eq('userId', userId)
            .order('name', { ascending: true });

        if (error) {
            if (error.code === '42P01') return NextResponse.json([]);
            throw error;
        }
        return NextResponse.json(data || []);
    } catch (e) {
        console.error('[ProjectFolders] GET failed:', e);
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    try {
        const { projectId, name } = await request.json();
        const normalizedName = normalizeFolderName(name);
        if (!projectId || !normalizedName) return NextResponse.json({ error: 'Ungültige Ordnerdaten.' }, { status: 400 });

        const client = supabaseAdmin || supabase;
        if (!await verifyProject(client, projectId, userId)) {
            return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
        }

        const { data: duplicate, error: duplicateError } = await client
            .from('project_folders')
            .select('id')
            .eq('projectId', projectId)
            .eq('userId', userId)
            .eq('name', normalizedName)
            .maybeSingle();
        if (duplicateError) throw duplicateError;
        if (duplicate) return NextResponse.json({ error: 'Ordner existiert bereits.' }, { status: 409 });

        const { data, error } = await client
            .from('project_folders')
            .insert({
                projectId,
                userId,
                name: normalizedName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e) {
        console.error('[ProjectFolders] POST failed:', e);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const { name } = await request.json();
        const normalizedName = normalizeFolderName(name);
        if (!normalizedName) return NextResponse.json({ error: 'Ungültiger Ordnername.' }, { status: 400 });
        const client = supabaseAdmin || supabase;

        const { data: oldFolder } = await client
            .from('project_folders')
            .select('name, projectId')
            .eq('id', id)
            .eq('userId', userId)
            .single();

        if (!oldFolder) return NextResponse.json({ error: 'Ordner nicht gefunden.' }, { status: 404 });

        const { data: duplicate, error: duplicateError } = await client
            .from('project_folders')
            .select('id')
            .eq('projectId', oldFolder.projectId)
            .eq('userId', userId)
            .eq('name', normalizedName)
            .neq('id', id)
            .maybeSingle();
        if (duplicateError) throw duplicateError;
        if (duplicate) return NextResponse.json({ error: 'Ordner existiert bereits.' }, { status: 409 });

        const { error: filesError } = await client
            .from('project_files')
            .update({ folder: normalizedName, updatedAt: new Date().toISOString() })
            .eq('projectId', oldFolder.projectId)
            .eq('folder', oldFolder.name)
            .eq('userId', userId);
        if (filesError) throw filesError;

        const { data: folder, error: folderError } = await client
            .from('project_folders')
            .update({ name: normalizedName, updatedAt: new Date().toISOString() })
            .eq('id', id)
            .eq('userId', userId)
            .select()
            .single();

        if (folderError) {
            // Best-effort rollback keeps file metadata attached to the original folder.
            await client
                .from('project_files')
                .update({ folder: oldFolder.name, updatedAt: new Date().toISOString() })
                .eq('projectId', oldFolder.projectId)
                .eq('folder', normalizedName)
                .eq('userId', userId);
            throw folderError;
        }

        return NextResponse.json(folder);
    } catch (e) {
        console.error('[ProjectFolders] PATCH failed:', e);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;

        const { data: folder, error: lookupError } = await client
            .from('project_folders')
            .select('id,name,projectId')
            .eq('id', id)
            .eq('userId', userId)
            .maybeSingle();
        if (lookupError) throw lookupError;
        if (!folder) return NextResponse.json({ error: 'Ordner nicht gefunden.' }, { status: 404 });

        const [{ data: projectFolders, error: foldersError }, { data: projectFiles, error: filesError }] = await Promise.all([
            client.from('project_folders').select('id,name').eq('projectId', folder.projectId).eq('userId', userId),
            client.from('project_files').select('id,folder').eq('projectId', folder.projectId).eq('userId', userId),
        ]);
        if (foldersError) throw foldersError;
        if (filesError) throw filesError;

        const prefix = `${folder.name}/`;
        const hasChildren = (projectFolders || []).some((candidate: any) =>
            candidate.id !== folder.id && candidate.name.startsWith(prefix)
        );
        const hasFiles = (projectFiles || []).some((file: any) =>
            file.folder === folder.name || file.folder?.startsWith(prefix)
        );
        if (hasChildren || hasFiles) {
            return NextResponse.json({
                error: 'Ordner ist nicht leer. Dateien und Unterordner müssen zuerst gelöscht werden.',
            }, { status: 409 });
        }

        const { error } = await client
            .from('project_folders')
            .delete()
            .eq('id', id)
            .eq('userId', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[ProjectFolders] DELETE failed:', e);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
