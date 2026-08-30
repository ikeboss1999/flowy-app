import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import {
    getEmployeeAvatarStoragePath,
    getEmployeeAvatarThumbStoragePath,
    resolveEmployeeAvatarUrl,
} from '@/lib/employee-avatar';

export const dynamic = 'force-dynamic';

const avatarSchema = z.object({
    avatar: z.string().trim().min(1).max(50000),
});

function isAllowedAvatarReference(value: string) {
    return (
        value.startsWith('storage:employee-avatars:') ||
        value.startsWith('data:image/svg+xml,')
    );
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getUserSession();
        const companyOwnerId = session?.companyOwnerId;

        if (!companyOwnerId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasPermission(session, 'employees_write')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const parsed = await parseJsonBody(request, avatarSchema);
        if (!parsed.ok) return parsed.response;

        if (!isAllowedAvatarReference(parsed.data.avatar)) {
            return NextResponse.json({ error: 'Avatar reference is not allowed' }, { status: 400 });
        }

        const client = supabaseAdmin || supabase;
        const { data: previous } = await client
            .from('employees')
            .select('avatar')
            .eq('id', params.id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        const { data, error } = await client
            .from('employees')
            .update({ avatar: parsed.data.avatar, updatedAt: new Date().toISOString(), updated_by: session.userId })
            .eq('id', params.id)
            .eq('userId', companyOwnerId)
            .select('id, avatar')
            .single();

        if (error) throw error;

        const previousStoragePath = getEmployeeAvatarStoragePath(previous?.avatar);
        const nextStoragePath = getEmployeeAvatarStoragePath(parsed.data.avatar);
        if (previousStoragePath && previousStoragePath !== nextStoragePath && supabaseAdmin) {
            const previousThumbPath = getEmployeeAvatarThumbStoragePath(previous?.avatar);
            await supabaseAdmin.storage
                .from('employee-avatars')
                .remove([previousStoragePath, previousThumbPath].filter(Boolean) as string[]);
        }

        return NextResponse.json({
            success: true,
            avatar: data.avatar,
            avatarUrl: await resolveEmployeeAvatarUrl(data.avatar),
        });
    } catch (error) {
        console.error('[EmployeeAvatar] POST failed:', error);
        return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getUserSession();
        const companyOwnerId = session?.companyOwnerId;

        if (!companyOwnerId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasPermission(session, 'employees_write')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const client = supabaseAdmin || supabase;
        const { data: previous } = await client
            .from('employees')
            .select('avatar')
            .eq('id', params.id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        const { error } = await client
            .from('employees')
            .update({ avatar: null, updatedAt: new Date().toISOString(), updated_by: session.userId })
            .eq('id', params.id)
            .eq('userId', companyOwnerId);

        if (error) throw error;

        const previousStoragePath = getEmployeeAvatarStoragePath(previous?.avatar);
        if (previousStoragePath && supabaseAdmin) {
            const previousThumbPath = getEmployeeAvatarThumbStoragePath(previous?.avatar);
            await supabaseAdmin.storage
                .from('employee-avatars')
                .remove([previousStoragePath, previousThumbPath].filter(Boolean) as string[]);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[EmployeeAvatar] DELETE failed:', error);
        return NextResponse.json({ error: 'Failed to delete avatar' }, { status: 500 });
    }
}
