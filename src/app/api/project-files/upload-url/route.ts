import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
]);

function validFolder(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 500 &&
        !value.trim().startsWith('/') && !value.trim().endsWith('/') &&
        !value.includes('//') && !value.split('/').includes('..');
}

function safeName(value: string) {
    const ext = value.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '';
    const base = value.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    return ext ? `${base}.${ext}` : base;
}

function safeFolder(value: string) {
    return value.toLowerCase()
        .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]/g, '_');
}

export async function POST(request: Request) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Storage not configured.' }, { status: 503 });

    try {
        const body = await request.json();
        const { projectId, folder, name, mimeType, size } = body || {};
        if (!projectId || !validFolder(folder) || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Ungültige Upload-Daten.' }, { status: 400 });
        }
        if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Datei zu groß. Maximal 10 MB erlaubt.' }, { status: 400 });
        }
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
            return NextResponse.json({ error: `Dateityp "${mimeType}" ist nicht erlaubt.` }, { status: 400 });
        }

        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects').select('id').eq('id', projectId).eq('userId', auth.companyOwnerId).maybeSingle();
        if (projectError) throw projectError;
        if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden oder Zugriff verweigert.' }, { status: 404 });

        const storagePath = `${auth.companyOwnerId}/${projectId}/${safeFolder(folder)}/${Date.now()}-${safeName(name)}`;
        const { data, error } = await supabaseAdmin.storage.from('project-files').createSignedUploadUrl(storagePath);
        if (error || !data?.token) throw error || new Error('Upload-URL konnte nicht erstellt werden.');
        return NextResponse.json({ path: storagePath, token: data.token });
    } catch (error) {
        console.error('[ProjectFiles] Upload URL failed:', error);
        return NextResponse.json({ error: 'Upload konnte nicht vorbereitet werden.' }, { status: 500 });
    }
}
