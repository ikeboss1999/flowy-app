import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { getEmployeeAvatarThumbStoragePath } from '@/lib/employee-avatar';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getUserSession();
        const companyOwnerId = session?.companyOwnerId;

        if (!companyOwnerId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasPermission(session, 'employees_read')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Signed uploads require service role configuration' }, { status: 503 });
        }

        const { data: employee, error: employeeError } = await (supabaseAdmin || supabase)
            .from('employees')
            .select('avatar')
            .eq('id', params.id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (employeeError) throw employeeError;
        if (!employee?.avatar) {
            return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
        }

        const thumbStoragePath = getEmployeeAvatarThumbStoragePath(employee.avatar);
        if (!thumbStoragePath) {
            return NextResponse.json({ error: 'Thumbnail path could not be derived' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin.storage
            .from('employee-avatars')
            .createSignedUploadUrl(thumbStoragePath);

        if (error) throw error;

        return NextResponse.json({
            bucket: 'employee-avatars',
            thumbStoragePath,
            thumbToken: data.token,
            expiresIn: 2 * 60 * 60,
        });
    } catch (error) {
        console.error('[EmployeeAvatarThumbUploadUrl] failed:', error);
        return NextResponse.json({ error: 'Failed to create thumbnail upload URL' }, { status: 500 });
    }
}
