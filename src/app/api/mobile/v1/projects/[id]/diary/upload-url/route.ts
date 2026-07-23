import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { requireMobileSession } from '@/lib/mobile-auth';
import {
    ALLOWED_DIARY_ATTACHMENT_MIME_TYPES,
    getAssignedMobileProject,
    mobileDiaryUploadUrlSchema,
    mobileProjectStoragePrefix,
    notAssignedProjectResponse,
    sanitizePathPart,
} from '@/lib/mobile-projects';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(request, 'projectDiary');
        if (!auth.ok) return auth.response;

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Signed uploads require service role configuration' }, { status: 503 });
        }

        const assigned = await getAssignedMobileProject(auth.client, {
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: params.id,
        });

        if (!assigned) return notAssignedProjectResponse();

        const parsed = await parseJsonBody(request, mobileDiaryUploadUrlSchema);
        if (!parsed.ok) return parsed.response;

        if (!ALLOWED_DIARY_ATTACHMENT_MIME_TYPES.has(parsed.data.mimeType)) {
            return NextResponse.json({ error: `File type "${parsed.data.mimeType}" is not allowed.` }, { status: 400 });
        }

        const extension = parsed.data.fileName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
        const baseName = parsed.data.fileName.replace(/\.[^/.]+$/, '');
        const storagePath = `${mobileProjectStoragePrefix({
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            projectId: params.id,
        })}${nanoid()}-${sanitizePathPart(baseName)}.${extension}`;

        const { data, error } = await supabaseAdmin.storage
            .from('project-diary-attachments')
            .createSignedUploadUrl(storagePath);

        if (error) throw error;

        return NextResponse.json({
            storagePath,
            signedUrl: data.signedUrl,
            token: data.token,
            bucket: 'project-diary-attachments',
            expiresIn: 2 * 60 * 60,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request body', issues: error.issues }, { status: 400 });
        }
        console.error('[MobileProjectDiaryUploadUrl] failed:', error);
        return NextResponse.json({ error: 'Failed to create mobile project diary upload URL' }, { status: 500 });
    }
}
