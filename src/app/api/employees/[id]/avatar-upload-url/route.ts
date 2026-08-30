import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import {
    ALLOWED_EMPLOYEE_AVATAR_MIME_TYPES,
    buildEmployeeAvatarStoragePath,
    getEmployeeAvatarThumbStoragePath,
    MAX_EMPLOYEE_AVATAR_SIZE,
} from '@/lib/employee-avatar';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const avatarUploadUrlSchema = z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.string().trim().min(1).max(120),
    fileSize: z.number().int().positive().max(MAX_EMPLOYEE_AVATAR_SIZE),
});

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getUserSession();
        const companyOwnerId = session?.companyOwnerId;

        if (!companyOwnerId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasPermission(session, 'employees_create') && !hasPermission(session, 'employees_write')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Signed uploads require service role configuration' }, { status: 503 });
        }

        const parsed = await parseJsonBody(request, avatarUploadUrlSchema);
        if (!parsed.ok) return parsed.response;

        if (!ALLOWED_EMPLOYEE_AVATAR_MIME_TYPES.has(parsed.data.mimeType)) {
            return NextResponse.json({ error: `File type "${parsed.data.mimeType}" is not allowed.` }, { status: 400 });
        }

        const storagePath = buildEmployeeAvatarStoragePath({
            companyOwnerId,
            employeeId: params.id,
            fileName: parsed.data.fileName,
        });

        const thumbStoragePath = getEmployeeAvatarThumbStoragePath(storagePath);
        if (!thumbStoragePath) {
            return NextResponse.json({ error: 'Failed to build thumbnail path' }, { status: 500 });
        }

        const { data, error } = await supabaseAdmin.storage
            .from('employee-avatars')
            .createSignedUploadUrl(storagePath);

        if (error) throw error;

        const { data: thumbData, error: thumbError } = await supabaseAdmin.storage
            .from('employee-avatars')
            .createSignedUploadUrl(thumbStoragePath);

        if (thumbError) throw thumbError;

        return NextResponse.json({
            storagePath,
            thumbStoragePath,
            token: data.token,
            thumbToken: thumbData.token,
            bucket: 'employee-avatars',
            expiresIn: 2 * 60 * 60,
        });
    } catch (error) {
        console.error('[EmployeeAvatarUploadUrl] failed:', error);
        return NextResponse.json({ error: 'Failed to create avatar upload URL' }, { status: 500 });
    }
}
