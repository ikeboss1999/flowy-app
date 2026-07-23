import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { requireMobileSession, sanitizeMobileEmployee } from '@/lib/mobile-auth';
import {
    getEmployeeAvatarStoragePath,
    toEmployeeAvatarReference,
} from '@/lib/employee-avatar';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const avatarSchema = z.object({
    storagePath: z.string().trim().min(1).max(500),
});

function getExpectedPrefix(companyOwnerId: string, employeeId: string) {
    return `${companyOwnerId}/${employeeId}/`;
}

export async function POST(request: Request) {
    try {
        const auth = await requireMobileSession(request);
        if (!auth.ok) return auth.response;

        const parsed = await parseJsonBody(request, avatarSchema);
        if (!parsed.ok) return parsed.response;

        const expectedPrefix = getExpectedPrefix(auth.companyOwnerId, auth.employeeId);
        if (!parsed.data.storagePath.startsWith(expectedPrefix)) {
            return NextResponse.json({ error: 'Avatar path is not allowed for this mobile employee' }, { status: 403 });
        }

        const previousStoragePath = getEmployeeAvatarStoragePath(auth.employee.avatar);
        const avatar = toEmployeeAvatarReference(parsed.data.storagePath);
        const { data, error } = await auth.client
            .from('employees')
            .update({ avatar, updatedAt: new Date().toISOString() })
            .eq('id', auth.employeeId)
            .eq('userId', auth.companyOwnerId)
            .select()
            .single();

        if (error) throw error;

        if (previousStoragePath && previousStoragePath !== parsed.data.storagePath && supabaseAdmin) {
            await supabaseAdmin.storage.from('employee-avatars').remove([previousStoragePath]);
        }

        return NextResponse.json({
            success: true,
            employee: await sanitizeMobileEmployee({
                ...auth.employee,
                avatar: data.avatar,
            }, auth.client, auth.companyOwnerId),
        });
    } catch (error) {
        console.error('[MobileAvatar] POST failed:', error);
        return NextResponse.json({ error: 'Failed to update mobile avatar' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requireMobileSession(request);
        if (!auth.ok) return auth.response;

        const previousStoragePath = getEmployeeAvatarStoragePath(auth.employee.avatar);
        const { error } = await auth.client
            .from('employees')
            .update({ avatar: null, updatedAt: new Date().toISOString() })
            .eq('id', auth.employeeId)
            .eq('userId', auth.companyOwnerId);

        if (error) throw error;

        if (previousStoragePath && supabaseAdmin) {
            await supabaseAdmin.storage.from('employee-avatars').remove([previousStoragePath]);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[MobileAvatar] DELETE failed:', error);
        return NextResponse.json({ error: 'Failed to delete mobile avatar' }, { status: 500 });
    }
}
