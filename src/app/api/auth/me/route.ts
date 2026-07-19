import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decryptEmployee } from '@/lib/encryption';
import { Employee } from '@/types/employee';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getUserSession();

        if (!session) {
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

        return NextResponse.json({
            user: {
                id: session.userId,
                name: session.name || session.email?.split('@')[0],
                email: session.email,
                role: session.role,
                companyOwnerId: session.companyOwnerId,
                permissions: session.permissions
            },
            employee
        }, { status: 200 });
    } catch (error) {
        console.error('[API Auth Me] GET Error:', error);
        return NextResponse.json({ user: null }, { status: 200 });
    }
}

