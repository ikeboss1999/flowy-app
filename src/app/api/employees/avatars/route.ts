import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import {
    hasEmployeeAvatarThumb,
    persistEmployeeInlineAvatar,
    resolveEmployeeAvatarThumbUrl,
} from '@/lib/employee-avatar';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

export async function GET() {
    const startedAt = performance.now();
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'employees_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
            .from('employees')
            .select('id, avatar')
            .eq('userId', companyOwnerId)
            .not('avatar', 'is', null)
            .limit(200);

        if (error) throw error;

        const avatars = await Promise.all((data || []).map(async (employee: any) => {
            let avatar = employee.avatar as string | null;

            if (avatar?.startsWith('data:image/') && supabaseAdmin) {
                avatar = await persistEmployeeInlineAvatar({
                    avatar,
                    companyOwnerId,
                    employeeId: employee.id,
                });

                await supabaseAdmin
                    .from('employees')
                    .update({ avatar, updatedAt: new Date().toISOString() })
                    .eq('id', employee.id)
                    .eq('userId', companyOwnerId);
            }

            return {
                id: employee.id,
                avatar,
                avatarUrl: await resolveEmployeeAvatarThumbUrl(avatar),
                needsThumb: !!avatar && !avatar.startsWith('data:image/') && !(await hasEmployeeAvatarThumb(avatar)),
            };
        }));

        logApiPerformance('/api/employees/avatars', startedAt, {
            rows: avatars.length,
            payload: avatars,
        });

        return NextResponse.json(avatars);
    } catch (error) {
        console.error('[EmployeeAvatars] GET failed:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
