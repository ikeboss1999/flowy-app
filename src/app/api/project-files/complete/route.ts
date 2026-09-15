import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Storage not configured.' }, { status: 503 });

    try {
        const body = await request.json();
        const { projectId, folder, name, storagePath, mimeType, size } = body || {};
        const ownerPrefix = `${auth.companyOwnerId}/${projectId}/`;
        if (!projectId || typeof folder !== 'string' || typeof name !== 'string' ||
            typeof storagePath !== 'string' || !storagePath.startsWith(ownerPrefix) ||
            !Number.isFinite(size) || size <= 0) {
            return NextResponse.json({ error: 'Ungültige Abschlussdaten.' }, { status: 400 });
        }

        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects').select('id').eq('id', projectId).eq('userId', auth.companyOwnerId).maybeSingle();
        if (projectError) throw projectError;
        if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden oder Zugriff verweigert.' }, { status: 404 });

        const lastSlash = storagePath.lastIndexOf('/');
        const parent = storagePath.slice(0, lastSlash);
        const storedName = storagePath.slice(lastSlash + 1);
        const { data: listed, error: listError } = await supabaseAdmin.storage.from('project-files').list(parent, { search: storedName, limit: 10 });
        if (listError) throw listError;
        if (!listed?.some((item) => item.name === storedName)) {
            return NextResponse.json({ error: 'Upload wurde im Speicher nicht gefunden.' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const { data, error } = await supabaseAdmin.from('project_files').insert({
            projectId, userId: auth.companyOwnerId, folder, name, storagePath,
            mimeType: mimeType || 'application/octet-stream', size, createdAt: now, updatedAt: now,
        }).select().single();
        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('[ProjectFiles] Upload completion failed:', error);
        return NextResponse.json({ error: 'Datei konnte nicht gespeichert werden.' }, { status: 500 });
    }
}
