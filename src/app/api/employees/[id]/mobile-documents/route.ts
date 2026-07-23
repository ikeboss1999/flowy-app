import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';
import { isAllowed } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const patchSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('folder'), id: z.string().min(1), name: z.string().trim().min(1).max(80) }),
    z.object({ type: z.literal('document'), id: z.string().min(1), name: z.string().trim().min(1).max(140).optional(), folderId: z.string().nullable().optional(), isShared: z.boolean().optional() }),
]);

function sanitizePathPart(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 90) || 'file';
}

async function verifyEmployee(client: any, employeeId: string, userId: string) {
    const { data, error } = await client
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .eq('userId', userId)
        .maybeSingle();

    if (error) throw error;
    return !!data;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('employees_read');
    if (!auth.ok) return auth.response;

    try {
        const client = supabaseAdmin || supabase;
        const employeeExists = await verifyEmployee(client, params.id, auth.companyOwnerId);
        if (!employeeExists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        const [{ data: folders, error: foldersError }, { data: documents, error: documentsError }] = await Promise.all([
            client
                .from('employee_document_folders')
                .select('*')
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', params.id)
                .order('sortOrder', { ascending: true })
                .order('name', { ascending: true }),
            client
                .from('employee_documents')
                .select('*')
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', params.id)
                .order('createdAt', { ascending: false }),
        ]);

        if (foldersError) throw foldersError;
        if (documentsError) throw documentsError;

        return NextResponse.json({ folders: folders || [], documents: documents || [] });
    } catch (error) {
        console.error('[EmployeeMobileDocuments] GET failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile documents' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('employees_write');
    if (!auth.ok) return auth.response;

    const client = supabaseAdmin || supabase;

    try {
        const employeeExists = await verifyEmployee(client, params.id, auth.companyOwnerId);
        if (!employeeExists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            if (!supabaseAdmin) {
                return NextResponse.json({ error: 'File uploads require service role configuration' }, { status: 503 });
            }

            const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
            if (!isAllowed(`employee-mobile-doc-upload-${ip}`, 20, 60 * 1000)) {
                return NextResponse.json({ error: 'Zu viele Dateiuploads. Bitte warten Sie eine Minute.' }, { status: 429 });
            }

            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            const folderId = (formData.get('folderId') as string | null) || null;
            const name = ((formData.get('name') as string | null) || file?.name || '').trim();
            const isShared = formData.get('isShared') !== 'false';

            if (!file || !name) {
                return NextResponse.json({ error: 'Missing file or name' }, { status: 400 });
            }

            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });
            }

            if (!ALLOWED_MIME_TYPES.has(file.type)) {
                return NextResponse.json({ error: `File type "${file.type}" is not allowed.` }, { status: 400 });
            }

            if (folderId) {
                const { data: folder, error: folderError } = await client
                    .from('employee_document_folders')
                    .select('id')
                    .eq('id', folderId)
                    .eq('userId', auth.companyOwnerId)
                    .eq('employeeId', params.id)
                    .maybeSingle();
                if (folderError) throw folderError;
                if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
            }

            const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
            const storagePath = `${auth.companyOwnerId}/${params.id}/${nanoid()}-${sanitizePathPart(name)}.${ext}`;
            const buffer = Buffer.from(await file.arrayBuffer());

            const { error: uploadError } = await supabaseAdmin.storage
                .from('employee-mobile-documents')
                .upload(storagePath, buffer, { contentType: file.type, upsert: false });

            if (uploadError) throw uploadError;

            const { data, error: insertError } = await supabaseAdmin
                .from('employee_documents')
                .insert({
                    userId: auth.companyOwnerId,
                    employeeId: params.id,
                    folderId,
                    name,
                    mimeType: file.type,
                    fileSize: file.size,
                    storagePath,
                    uploadedBy: auth.actorUserId,
                    isShared,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) {
                await supabaseAdmin.storage.from('employee-mobile-documents').remove([storagePath]);
                throw insertError;
            }

            return NextResponse.json(data, { status: 201 });
        }

        const parsed = await parseJsonBody(request, z.object({ type: z.literal('folder'), name: z.string().trim().min(1).max(80) }));
        if (!parsed.ok) return parsed.response;

        const { data, error } = await client
            .from('employee_document_folders')
            .insert({
                userId: auth.companyOwnerId,
                employeeId: params.id,
                name: parsed.data.name,
                createdBy: auth.actorUserId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('[EmployeeMobileDocuments] POST failed:', error);
        return NextResponse.json({ error: 'Failed to create mobile document resource' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('employees_write');
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, patchSchema);
    if (!parsed.ok) return parsed.response;

    try {
        const client = supabaseAdmin || supabase;
        const employeeExists = await verifyEmployee(client, params.id, auth.companyOwnerId);
        if (!employeeExists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        if (parsed.data.type === 'folder') {
            const { data, error } = await client
                .from('employee_document_folders')
                .update({ name: parsed.data.name, updatedAt: new Date().toISOString() })
                .eq('id', parsed.data.id)
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', params.id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(data);
        }

        if (parsed.data.folderId) {
            const { data: folder, error: folderError } = await client
                .from('employee_document_folders')
                .select('id')
                .eq('id', parsed.data.folderId)
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', params.id)
                .maybeSingle();
            if (folderError) throw folderError;
            if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        if (parsed.data.name !== undefined) updates.name = parsed.data.name;
        if (parsed.data.folderId !== undefined) updates.folderId = parsed.data.folderId;
        if (parsed.data.isShared !== undefined) updates.isShared = parsed.data.isShared;

        const { data, error } = await client
            .from('employee_documents')
            .update(updates)
            .eq('id', parsed.data.id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', params.id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('[EmployeeMobileDocuments] PATCH failed:', error);
        return NextResponse.json({ error: 'Failed to update mobile document resource' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('employees_write');
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if ((type !== 'folder' && type !== 'document') || !id) {
        return NextResponse.json({ error: 'Missing or invalid type/id' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const employeeExists = await verifyEmployee(client, params.id, auth.companyOwnerId);
        if (!employeeExists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        if (type === 'folder') {
            const { count, error: countError } = await client
                .from('employee_documents')
                .select('id', { count: 'exact', head: true })
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', params.id)
                .eq('folderId', id);

            if (countError) throw countError;
            if ((count || 0) > 0) {
                return NextResponse.json({ error: 'Folder is not empty' }, { status: 409 });
            }

            const { error } = await client
                .from('employee_document_folders')
                .delete()
                .eq('id', id)
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', params.id);

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        const { data: doc, error: lookupError } = await client
            .from('employee_documents')
            .select('storagePath')
            .eq('id', id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', params.id)
            .maybeSingle();

        if (lookupError) throw lookupError;
        if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

        if (supabaseAdmin) {
            await supabaseAdmin.storage.from('employee-mobile-documents').remove([doc.storagePath]);
        }

        const { error } = await client
            .from('employee_documents')
            .delete()
            .eq('id', id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', params.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[EmployeeMobileDocuments] DELETE failed:', error);
        return NextResponse.json({ error: 'Failed to delete mobile document resource' }, { status: 500 });
    }
}
