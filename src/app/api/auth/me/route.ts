import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decryptEmployee } from '@/lib/encryption';
import { Employee } from '@/types/employee';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

export async function GET() {
    const startedAt = performance.now();
    try {
        const session = await getUserSession();

        if (!session) {
            logApiPerformance('/api/auth/me', startedAt, { note: 'anonymous' });
            return NextResponse.json({ user: null }, { status: 200 });
        }

        let employee: Employee | null = null;

        if (session.role === 'employee' && session.employeeId) {
            const client = supabaseAdmin || supabase;
            const { data, error } = await client
                .from('employees')
                .select('*')
                .eq('id', session.employeeId)
                .eq('userId', session.companyOwnerId)
                .maybeSingle();

            if (!error && data) {
                const decrypted = decryptEmployee(data as Employee);
                employee = {
                    ...decrypted,
                    appAccess: decrypted.appAccess
                        ? { ...decrypted.appAccess, accessPIN: '' }
                        : decrypted.appAccess,
                };
            }
        }

        const payload = {
            user: {
                id: session.userId,
                name: session.name || session.email?.split('@')[0],
                email: session.email,
                role: session.role,
                companyOwnerId: session.companyOwnerId,
                permissions: session.permissions
            },
            employee
        };
        logApiPerformance('/api/auth/me', startedAt, { payload, note: session.role });
        return NextResponse.json(payload, { status: 200 });
    } catch (error) {
        console.error('[API Auth Me] GET Error:', error);
        return NextResponse.json({ user: null }, { status: 200 });
    }
}

