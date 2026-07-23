import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const createDiaryEntrySchema = z.object({
    description: z.string().trim().min(1).max(5000),
    visibility: z.enum(['office', 'assigned_team']).default('office'),
});

async function verifyProject(client: any, projectId: string, companyOwnerId: string) {
    const { data, error } = await client
        .from('projects')
        .select('id,diaryEntries')
        .eq('id', projectId)
        .eq('userId', companyOwnerId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

function serializeEntry(entry: any) {
    return {
        id: entry.id,
        projectId: entry.projectId,
        employeeId: entry.employeeId,
        source: entry.source,
        description: entry.description,
        visibility: entry.visibility,
        status: entry.status,
        clientOperationId: entry.clientOperationId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        attachments: entry.attachments || [],
    };
}

async function serializeStorageAttachment(attachment: any) {
    let url: string | null = null;

    if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.storage
            .from('project-diary-attachments')
            .createSignedUrl(attachment.storagePath, 10 * 60, { download: false });

        if (!error) {
            url = data.signedUrl;
        }
    }

    return {
        id: attachment.id,
        diaryEntryId: attachment.diaryEntryId,
        storagePath: attachment.storagePath,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        createdAt: attachment.createdAt,
        url,
        expiresIn: url ? 10 * 60 : null,
    };
}

function serializeLegacyEntry(entry: any, projectId: string) {
    return {
        id: entry.id,
        projectId,
        employeeId: null,
        source: 'web-legacy',
        description: entry.description || '',
        visibility: 'office',
        status: 'published',
        clientOperationId: null,
        createdAt: entry.date,
        updatedAt: entry.date,
        attachments: (entry.images || []).map((image: string, index: number) => ({
            id: `${entry.id}-legacy-image-${index}`,
            storagePath: image,
            mimeType: image.startsWith('data:image/') ? image.slice(5, image.indexOf(';')) : 'image/*',
            fileSize: 0,
            createdAt: entry.date,
            isLegacyInlineImage: true,
        })),
    };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('projects_read');
    if (!auth.ok) return auth.response;

    try {
        const client = supabaseAdmin || supabase;
        const project = await verifyProject(client, params.id, auth.companyOwnerId);
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const { data: entries, error: entriesError } = await client
            .from('project_diary_entries')
            .select('*')
            .eq('userId', auth.companyOwnerId)
            .eq('projectId', params.id)
            .neq('status', 'deleted')
            .order('createdAt', { ascending: false });

        if (entriesError) throw entriesError;

        const entryIds = (entries || []).map((entry: any) => entry.id);
        const attachmentsByEntryId = new Map<string, any[]>();

        if (entryIds.length > 0) {
            const { data: attachments, error: attachmentsError } = await client
                .from('project_diary_attachments')
                .select('*')
                .eq('userId', auth.companyOwnerId)
                .in('diaryEntryId', entryIds)
                .order('createdAt', { ascending: true });

            if (attachmentsError) throw attachmentsError;

            const serializedAttachments = await Promise.all((attachments || []).map(serializeStorageAttachment));

            for (const attachment of serializedAttachments) {
                const current = attachmentsByEntryId.get(attachment.diaryEntryId) || [];
                current.push(attachment);
                attachmentsByEntryId.set(attachment.diaryEntryId, current);
            }
        }

        const tableEntries = (entries || []).map((entry: any) => serializeEntry({
            ...entry,
            attachments: attachmentsByEntryId.get(entry.id) || [],
        }));
        const legacyEntries = Array.isArray(project.diaryEntries)
            ? project.diaryEntries.map((entry: any) => serializeLegacyEntry(entry, params.id))
            : [];

        return NextResponse.json({
            entries: [...tableEntries, ...legacyEntries].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
        });
    } catch (error) {
        console.error('[ProjectDiary] GET failed:', error);
        return NextResponse.json({ error: 'Failed to fetch project diary' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, createDiaryEntrySchema);
    if (!parsed.ok) return parsed.response;

    try {
        const client = supabaseAdmin || supabase;
        const project = await verifyProject(client, params.id, auth.companyOwnerId);
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const now = new Date().toISOString();
        const { data, error } = await client
            .from('project_diary_entries')
            .insert({
                userId: auth.companyOwnerId,
                projectId: params.id,
                employeeId: null,
                createdByUserId: auth.actorUserId,
                source: 'web',
                description: parsed.data.description,
                visibility: parsed.data.visibility,
                status: 'published',
                createdAt: now,
                updatedAt: now,
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, entry: serializeEntry(data) }, { status: 201 });
    } catch (error) {
        console.error('[ProjectDiary] POST failed:', error);
        return NextResponse.json({ error: 'Failed to create project diary entry' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('projects_write');
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        const project = await verifyProject(client, params.id, auth.companyOwnerId);
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const { data, error } = await client
            .from('project_diary_entries')
            .update({ status: 'deleted', updatedAt: new Date().toISOString() })
            .eq('id', id)
            .eq('userId', auth.companyOwnerId)
            .eq('projectId', params.id)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Diary entry not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[ProjectDiary] DELETE failed:', error);
        return NextResponse.json({ error: 'Failed to delete project diary entry' }, { status: 500 });
    }
}
