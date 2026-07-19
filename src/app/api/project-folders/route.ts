import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

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
        if (!projectId || !name) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

        const client = supabaseAdmin || supabase;
        const { data, error } = await client
            .from('project_folders')
            .insert({
                projectId,
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
        const client = supabaseAdmin || supabase;

        const { data: oldFolder } = await client
            .from('project_folders')
            .select('name, projectId')
            .eq('id', id)
            .eq('userId', userId)
            .single();

        const { data: folder, error: folderError } = await client
            .from('project_folders')
            .update({ name: name.trim(), updatedAt: new Date().toISOString() })
            .eq('id', id)
            .eq('userId', userId)
            .select()
            .single();

        if (folderError) throw folderError;

        if (oldFolder) {
            await client
                .from('project_files')
                .update({ folder: name.trim() })
                .eq('projectId', oldFolder.projectId)
                .eq('folder', oldFolder.name)
                .eq('userId', userId);
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
