import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Employee } from '@/types/employee';
import { isAllowed } from '@/lib/rate-limit';
import { decryptEmployee } from '@/lib/encryption';
import { getClientIp, parseJsonBody } from '@/lib/api-validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const employeeLoginSchema = z.object({
    staffId: z.string().trim().min(1).max(80),
    pin: z.string().trim().min(1).max(32),
});

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        if (!isAllowed(`employee-login-ip-${ip}`, 20, 60 * 1000)) {
            return NextResponse.json({ message: 'Zu viele Login-Versuche. Bitte versuchen Sie es in einer Minute erneut.' }, { status: 429 });
        }

        const parsed = await parseJsonBody(request, employeeLoginSchema);
        if (!parsed.ok) return parsed.response;

        const { staffId, pin } = parsed.data;
        if (!isAllowed(`employee-login-staff-${ip}-${staffId}`, 5, 5 * 60 * 1000)) {
            return NextResponse.json({ message: 'Zu viele Login-Versuche. Bitte versuchen Sie es in fünf Minuten erneut.' }, { status: 429 });
        }

        if (!staffId || !pin) {
            return NextResponse.json({ message: 'Verfügernummer und PIN sind erforderlich' }, { status: 400 });
        }

        const client = supabaseAdmin || supabase;
        if (!supabaseAdmin) {
            console.warn('[EmployeeLogin] WARNING: supabaseAdmin is null. Falling back to anonymous client. Search may fail due to RLS.');
        }

        const { data, error } = await client
            .from('employees')
            .select('id, userId, personalData, appAccess')
            .filter('appAccess->>staffId', 'eq', staffId)
            .single();

        if (error || !data) {
            return NextResponse.json({ message: 'Mitarbeiter nicht gefunden' }, { status: 404 });
        }

        const employee = decryptEmployee(data as Employee);

        // Verify Access Status
        if (!employee.appAccess?.isAccessEnabled) {
            return NextResponse.json({ message: 'App-Zugriff ist für diesen Mitarbeiter deaktiviert' }, { status: 403 });
        }

        // Verify PIN — supports bcrypt hashes (new) and plain-text (legacy migration)
        const storedPin = employee.appAccess.accessPIN;
        const isHashed = storedPin?.startsWith('$2b$') || storedPin?.startsWith('$2a$');
        const isPinValid = isHashed
            ? await bcrypt.compare(pin, storedPin)
            : storedPin === pin;

        if (!isPinValid) {
            return NextResponse.json({ message: 'Ungültiger PIN' }, { status: 401 });
        }

        // Strip PIN from response
        const { appAccess, ...safeEmployee } = employee;
        const responseEmployee = {
            ...safeEmployee,
            appAccess: {
                ...appAccess,
                accessPIN: undefined
            }
        };

        const { createSessionToken, createSupabaseToken } = await import('@/lib/auth');
        const sessionToken = await createSessionToken({
            userId: employee.userId!,
            email: employee.personalData.email || 'employee@flowy.local',
            role: 'employee',
            employeeId: employee.id
        });

        const supabaseToken = await createSupabaseToken({
            employeeId: employee.id,
            ownerId: employee.userId!,
            email: employee.personalData.email || 'employee@flowy.local',
        });

        const response = NextResponse.json({
            success: true,
            employee: responseEmployee,
            supabase_token: supabaseToken
        });

        response.cookies.set('session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours (aligns with JWT expiration)
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Employee Login Error:', error);
        return NextResponse.json({ message: 'Interner Serverfehler' }, { status: 500 });
    }
}
