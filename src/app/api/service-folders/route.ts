import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

function normalizeFolderPath(value: string) {
    return String(value || '')
        .split('/')
        .map(part => part.trim())
        .filter(Boolean)
        .join('/');
}

function isSameOrChildPath(path: string, parentPath: string) {
    return path === parentPath || path.startsWith(`${parentPath}/`);
}

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
        const { name, parentName } = await request.json();
        const folderName = normalizeFolderPath(name);
        const parentPath = normalizeFolderPath(parentName || '');
        const fullPath = normalizeFolderPath(parentPath ? `${parentPath}/${folderName}` : folderName);
        if (!fullPath) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

        const client = supabaseAdmin || supabase;
        const { data: existingFolder, error: existingError } = await client
            .from('service_folders')
            .select('id')
            .eq('userId', userId)
            .eq('name', fullPath)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existingFolder) return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });

        const { data, error } = await client
            .from('service_folders')
            .insert({
                userId,
                name: fullPath,
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
        const nextName = normalizeFolderPath(name);
        if (!nextName) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
        const client = supabaseAdmin || supabase;

        // Get old folder name first
        const { data: oldFolder } = await client
            .from('service_folders')
            .select('name')
            .eq('id', id)
            .single();

        if (!oldFolder?.name) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

        const oldPath = normalizeFolderPath(oldFolder.name);
        const parentPath = oldPath.includes('/') ? oldPath.split('/').slice(0, -1).join('/') : '';
        const nextPath = nextName.includes('/') ? nextName : normalizeFolderPath(parentPath ? `${parentPath}/${nextName}` : nextName);

        const { data: folders } = await client
            .from('service_folders')
            .select('id,name')
            .eq('userId', userId);

        const conflictingFolder = (folders || []).find((folder: any) => folder.id !== id && normalizeFolderPath(folder.name) === nextPath);
        if (conflictingFolder) return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });

        const { data: folder, error: folderError } = await client
            .from('service_folders')
            .update({ name: nextPath, updatedAt: new Date().toISOString() })
            .eq('id', id)
            .eq('userId', userId)
            .select()
            .single();

        if (folderError) throw folderError;

        if (oldPath !== nextPath) {
            for (const childFolder of folders || []) {
                const childPath = normalizeFolderPath(childFolder.name);
                if (childFolder.id !== id && isSameOrChildPath(childPath, oldPath)) {
                    const childNextPath = normalizeFolderPath(`${nextPath}${childPath.slice(oldPath.length)}`);
                    const { error: childError } = await client
                        .from('service_folders')
                        .update({ name: childNextPath, updatedAt: new Date().toISOString() })
                        .eq('id', childFolder.id)
                        .eq('userId', userId);
                    if (childError) throw childError;
                }
            }

            const { data: positionServices, error: servicesLoadError } = await client
                .from('services')
                .select('id,folder')
                .eq('userId', userId)
                .eq('category', 'Position');
            if (servicesLoadError) throw servicesLoadError;

            for (const service of positionServices || []) {
                const serviceFolder = normalizeFolderPath(service.folder || '');
                if (isSameOrChildPath(serviceFolder, oldPath)) {
                    const serviceNextPath = normalizeFolderPath(`${nextPath}${serviceFolder.slice(oldPath.length)}`);
                    const { error: serviceError } = await client
                        .from('services')
                        .update({ folder: serviceNextPath })
                        .eq('id', service.id)
                        .eq('userId', userId);
                    if (serviceError) throw serviceError;
                }
            }
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
        
        // Get the folder name before deleting so the contained presets can be removed too.
        const { data: oldFolder } = await client
            .from('service_folders')
            .select('name')
            .eq('id', id)
            .eq('userId', userId)
            .single();

        if (!oldFolder?.name) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

        const folderPath = normalizeFolderPath(oldFolder.name);
        const { data: folders, error: foldersError } = await client
            .from('service_folders')
            .select('id,name')
            .eq('userId', userId);
        if (foldersError) throw foldersError;

        const folderIdsToDelete = (folders || [])
            .filter((folder: any) => isSameOrChildPath(normalizeFolderPath(folder.name), folderPath))
            .map((folder: any) => folder.id);

        const { error } = await client
            .from('service_folders')
            .delete()
            .in('id', folderIdsToDelete)
            .eq('userId', userId);

        if (error) throw error;
        
        const { data: positionServices, error: servicesLoadError } = await client
            .from('services')
            .select('id,folder')
            .eq('userId', userId)
            .eq('category', 'Position');
        if (servicesLoadError) throw servicesLoadError;

        const serviceIdsToDelete = (positionServices || [])
            .filter((service: any) => isSameOrChildPath(normalizeFolderPath(service.folder || ''), folderPath))
            .map((service: any) => service.id);

        if (serviceIdsToDelete.length > 0) {
            const { error: servicesError } = await client
                .from('services')
                .delete()
                .in('id', serviceIdsToDelete)
                .eq('userId', userId)
                .eq('category', 'Position');
            if (servicesError) throw servicesError;
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[ServiceFolders] DELETE failed:', e);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
