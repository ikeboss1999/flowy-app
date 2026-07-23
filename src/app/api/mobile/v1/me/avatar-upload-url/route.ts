import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { requireMobileSession } from '@/lib/mobile-auth';
import {
    ALLOWED_EMPLOYEE_AVATAR_MIME_TYPES,
    buildEmployeeAvatarStoragePath,
    MAX_EMPLOYEE_AVATAR_SIZE,
} from '@/lib/employee-avatar';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const avatarUploadUrlSchema = z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.string().trim().min(1).max(120),
    fileSize: z.number().int().positive().max(MAX_EMPLOYEE_AVATAR_SIZE),
});

export async function POST(request: Request) {
    try {
        const auth = await requireMobileSession(request);
        if (!auth.ok) return auth.response;

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Signed uploads require service role configuration' }, { status: 503 });
        }

        const parsed = await parseJsonBody(request, avatarUploadUrlSchema);
        if (!parsed.ok) return parsed.response;

        if (!ALLOWED_EMPLOYEE_AVATAR_MIME_TYPES.has(parsed.data.mimeType)) {
            return NextResponse.json({ error: `File type "${parsed.data.mimeType}" is not allowed.` }, { status: 400 });
        }

        const storagePath = buildEmployeeAvatarStoragePath({
            companyOwnerId: auth.companyOwnerId,
            employeeId: auth.employeeId,
            fileName: parsed.data.fileName,
        });

        const { data, error } = await supabaseAdmin.storage
            .from('employee-avatars')
            .createSignedUploadUrl(storagePath);

        if (error) throw error;

        return NextResponse.json({
            storagePath,
            signedUrl: data.signedUrl,
            token: data.token,
            bucket: 'employee-avatars',
            expiresIn: 2 * 60 * 60,
        });
    } catch (error) {
        console.error('[MobileAvatarUploadUrl] failed:', error);
        return NextResponse.json({ error: 'Failed to create mobile avatar upload URL' }, { status: 500 });
    }
}
