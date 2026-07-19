import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requireApiSession(['invoices_write', 'offers_write']);
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
            .from('service_folders')
            .select('*')
            .eq('userId', userId)
            .order('name', { ascending: true });

        if (error) {
            if (error.code === '42P01') return NextResponse.json([]); // Table doesn't exist yet
            throw error;
        }
        return NextResponse.json(data || []);
    } catch (e) {
        console.error('[ServiceFolders] GET failed:', e);
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireApiSession(['invoices_write', 'offers_write']);
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    try {
        const { name } = await request.json();
        if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

        const client = supabaseAdmin || supabase;
        const { data, error } = await client
            .from('service_folders')
            .insert({
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
        console.error('[ServiceFolders] POST failed:', e);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const auth = await requireApiSession(['invoices_write', 'offers_write']);
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const { name } = await request.json();
        const client = supabaseAdmin || supabase;

        // Get old folder name first
        const { data: oldFolder } = await client
            .from('service_folders')
            .select('name')
            .eq('id', id)
            .single();

        const { data: folder, error: folderError } = await client
            .from('service_folders')
            .update({ name: name.trim(), updatedAt: new Date().toISOString() })
            .eq('id', id)
            .eq('userId', userId)
            .select()
            .single();

        if (folderError) throw folderError;

        // Update all services that were in this folder
        if (oldFolder && oldFolder.name !== name.trim()) {
            await client
                .from('services')
                .update({ folder: name.trim() })
                .eq('folder', oldFolder.name)
                .eq('userId', userId);
        }

        return NextResponse.json(folder);
    } catch (e) {
        console.error('[ServiceFolders] PATCH failed:', e);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await requireApiSession(['invoices_write', 'offers_write']);
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        
        // Let's get the folder name before deleting, so we can unassign services
        const { data: oldFolder } = await client
            .from('service_folders')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await client
            .from('service_folders')
            .delete()
            .eq('id', id)
            .eq('userId', userId);

        if (error) throw error;
        
        // Remove the folder assignment from services that were inside this folder
        if (oldFolder) {
             await client
                .from('services')
                .update({ folder: null })
                .eq('folder', oldFolder.name)
                .eq('userId', userId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[ServiceFolders] DELETE failed:', e);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
