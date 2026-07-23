import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { parseJsonBody, getClientIp } from '@/lib/api-validation';
import { isAllowed } from '@/lib/rate-limit';
import { decryptEmployee } from '@/lib/encryption';
import { Employee } from '@/types/employee';
import {
    createMobileSession,
    getMobileClient,
    issueMobileTokens,
    sanitizeMobileEmployee,
} from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
    staffId: z.string().trim().min(1).max(80),
    pin: z.string().trim().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
    platform: z.string().trim().max(40).optional(),
    deviceName: z.string().trim().max(120).optional(),
    appVersion: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
    const ip = getClientIp(request);
    if (!isAllowed(`mobile-login-ip-${ip}`, 30, 60 * 1000)) {
        return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
    }

    const parsed = await parseJsonBody(request, loginSchema);
    if (!parsed.ok) return parsed.response;

    const { staffId, pin, platform, deviceName, appVersion } = parsed.data;
    if (!isAllowed(`mobile-login-staff-${ip}-${staffId}`, 6, 5 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many login attempts for this staff ID' }, { status: 429 });
    }

    try {
        const client = getMobileClient();
        const { data, error } = await client
            .from('employees')
            .select('*')
            .filter('appAccess->>staffId', 'eq', staffId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Invalid staff ID or PIN' }, { status: 401 });

        const employee = decryptEmployee(data as Employee);
        const companyOwnerId = employee.userId;
        if (!companyOwnerId || !employee.appAccess?.isAccessEnabled || employee.employment?.isActive === false) {
            return NextResponse.json({ error: 'Mobile access disabled' }, { status: 403 });
        }

        const storedPin = employee.appAccess.accessPIN;
        const isHashed = storedPin?.startsWith('$2b$') || storedPin?.startsWith('$2a$') || storedPin?.startsWith('$2y$');
        const isPinValid = isHashed ? await bcrypt.compare(pin, storedPin) : storedPin === pin;
        if (!isPinValid) {
            return NextResponse.json({ error: 'Invalid staff ID or PIN' }, { status: 401 });
        }

        const now = new Date().toISOString();
        const sessionResult = await createMobileSession({ companyOwnerId, employeeId: employee.id, platform, deviceName, appVersion });
        const employeeWithAccess = {
            ...employee,
            appAccess: {
                ...employee.appAccess,
                lastLogin: now,
            },
        };

        const { error: employeeUpdateError } = await client
            .from('employees')
            .update({ appAccess: employeeWithAccess.appAccess, updatedAt: now })
            .eq('id', employee.id)
            .eq('userId', companyOwnerId);

        if (employeeUpdateError) throw employeeUpdateError;

        const tokens = await issueMobileTokens({
            companyOwnerId,
            employee: employeeWithAccess,
            sessionId: sessionResult.session.id,
        });

        return NextResponse.json({
            success: true,
            ...tokens,
            refreshToken: sessionResult.refreshToken,
            refreshTokenExpiresAt: sessionResult.expiresAt,
            employee: await sanitizeMobileEmployee(employeeWithAccess, client, companyOwnerId),
        });
    } catch (error) {
        console.error('[MobileAuthLogin] failed:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
