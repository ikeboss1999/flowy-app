import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { requireMobileSession } from '@/lib/mobile-auth';
import {
    getAssignedMobileProject,
    mobileDiaryEntrySchema,
    mobileProjectStoragePrefix,
    notAssignedProjectResponse,
} from '@/lib/mobile-projects';

export const dynamic = 'force-dynamic';

function serializeAttachment(attachment: any) {
    return {
        id: attachment.id,
        storagePath: attachment.storagePath,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        createdAt: attachment.createdAt,
    };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(request, 'projectDiary');
        if (!auth.ok) return auth.response;

        const assigned = await getAssignedMobileProject(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: params.id,
        });

        if (!assigned) return notAssignedProjectResponse();

        const { data: entries, error: entriesError } = await auth.client
            .from('project_diary_entries')
            .select('*')
            .eq('userId', auth.companyOwnerId)
            .eq('projectId', params.id)
            .eq('status', 'published')
            .or(`visibility.eq.assigned_team,employeeId.eq.${auth.employeeId}`)
            .order('createdAt', { ascending: false });

        if (entriesError) throw entriesError;

        const entryIds = (entries || []).map((entry: any) => entry.id);
        let attachmentsByEntryId = new Map<string, any[]>();

        if (entryIds.length > 0) {
            const { data: attachments, error: attachmentsError } = await auth.client
                .from('project_diary_attachments')
                .select('*')
                .eq('userId', auth.companyOwnerId)
                .in('diaryEntryId', entryIds)
                .order('createdAt', { ascending: true });

            if (attachmentsError) throw attachmentsError;

            attachmentsByEntryId = new Map();
            for (const attachment of attachments || []) {
                const current = attachmentsByEntryId.get(attachment.diaryEntryId) || [];
                current.push(serializeAttachment(attachment));
                attachmentsByEntryId.set(attachment.diaryEntryId, current);
            }
        }

        return NextResponse.json({
            entries: (entries || []).map((entry: any) => ({
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
                attachments: attachmentsByEntryId.get(entry.id) || [],
            })),
        });
    } catch (error) {
        console.error('[MobileProjectDiary] GET failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile project diary' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(request, 'projectDiary');
        if (!auth.ok) return auth.response;

        const assigned = await getAssignedMobileProject(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: params.id,
        });

        if (!assigned) return notAssignedProjectResponse();

        const parsed = await parseJsonBody(request, mobileDiaryEntrySchema);
        if (!parsed.ok) return parsed.response;

        const expectedPrefix = mobileProjectStoragePrefix({
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: params.id,
        });
        const hasInvalidAttachment = parsed.data.attachments.some((attachment) => !attachment.storagePath.startsWith(expectedPrefix));
        if (hasInvalidAttachment) {
            return NextResponse.json({ error: 'Attachment path is not allowed for this mobile employee' }, { status: 403 });
        }

        const now = new Date().toISOString();
        const { data: entry, error: entryError } = await auth.client
            .from('project_diary_entries')
            .insert({
                userId: auth.companyOwnerId,
                projectId: params.id,
                employeeId: auth.employeeId,
                createdByUserId: auth.employeeId,
                source: 'mobile',
                description: parsed.data.description,
                visibility: parsed.data.visibility,
                status: 'published',
                clientOperationId: parsed.data.clientOperationId || null,
                createdAt: now,
                updatedAt: now,
            })
            .select()
            .single();

        if (entryError) throw entryError;

        let attachments: any[] = [];
        if (parsed.data.attachments.length > 0) {
            const { data, error: attachmentsError } = await auth.client
                .from('project_diary_attachments')
                .insert(parsed.data.attachments.map((attachment) => ({
                    userId: auth.companyOwnerId,
                    diaryEntryId: entry.id,
                    storagePath: attachment.storagePath,
                    mimeType: attachment.mimeType,
                    fileSize: attachment.fileSize,
                    createdAt: now,
                })))
                .select();

            if (attachmentsError) throw attachmentsError;
            attachments = data || [];
        }

        return NextResponse.json({
            success: true,
            entry: {
                ...entry,
                attachments: attachments.map(serializeAttachment),
            },
        }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request body', issues: error.issues }, { status: 400 });
        }
        console.error('[MobileProjectDiary] POST failed:', error);
        return NextResponse.json({ error: 'Failed to create mobile project diary entry' }, { status: 500 });
    }
}
