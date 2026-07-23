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

const activateSchema = z.object({
    staffId: z.string().trim().min(1).max(80),
    activationCode: z.string().trim().min(4).max(20),
    pin: z.string().trim().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
    platform: z.string().trim().max(40).optional(),
    deviceName: z.string().trim().max(120).optional(),
    appVersion: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
    const ip = getClientIp(request);
    if (!isAllowed(`mobile-activate-ip-${ip}`, 20, 60 * 1000)) {
        return NextResponse.json({ error: 'Too many activation attempts' }, { status: 429 });
    }

    const parsed = await parseJsonBody(request, activateSchema);
    if (!parsed.ok) return parsed.response;

    const { staffId, activationCode, pin, platform, deviceName, appVersion } = parsed.data;
    if (!isAllowed(`mobile-activate-staff-${ip}-${staffId}`, 6, 5 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many activation attempts for this staff ID' }, { status: 429 });
    }

    try {
        const client = getMobileClient();
        const { data, error } = await client
            .from('employees')
            .select('*')
            .filter('appAccess->>staffId', 'eq', staffId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Invalid activation data' }, { status: 401 });

        const employee = decryptEmployee(data as Employee);
        const companyOwnerId = employee.userId;
        if (!companyOwnerId || !employee.appAccess?.isAccessEnabled || employee.employment?.isActive === false) {
            return NextResponse.json({ error: 'Mobile access disabled' }, { status: 403 });
        }

        const now = new Date().toISOString();
        const { data: codeRecord, error: codeError } = await client
            .from('mobile_activation_codes')
            .select('*')
            .eq('userId', companyOwnerId)
            .eq('employeeId', employee.id)
            .eq('status', 'active')
            .gt('expiresAt', now)
            .maybeSingle();

        if (codeError) throw codeError;
        if (!codeRecord) return NextResponse.json({ error: 'Invalid or expired activation code' }, { status: 401 });

        const isCodeValid = await bcrypt.compare(activationCode, codeRecord.codeHash);
        if (!isCodeValid) {
            await client
                .from('mobile_activation_codes')
                .update({ attempts: (codeRecord.attempts || 0) + 1, updatedAt: now })
                .eq('id', codeRecord.id);
            return NextResponse.json({ error: 'Invalid or expired activation code' }, { status: 401 });
        }

        const { data: consumedCode, error: codeUpdateError } = await client
            .from('mobile_activation_codes')
            .update({ status: 'consumed', consumedAt: now, updatedAt: now })
            .eq('id', codeRecord.id)
            .eq('status', 'active')
            .gt('expiresAt', now)
            .select('id')
            .maybeSingle();

        if (codeUpdateError) throw codeUpdateError;
        if (!consumedCode) return NextResponse.json({ error: 'Invalid or expired activation code' }, { status: 401 });

        const pinHash = await bcrypt.hash(pin, 10);
        const appAccess = {
            ...employee.appAccess,
            accessPIN: pinHash,
            isAccessEnabled: true,
            permissions: {
                timeTracking: employee.appAccess.permissions?.timeTracking ?? true,
                documents: employee.appAccess.permissions?.documents ?? false,
                personalData: true,
                projectDiary: employee.appAccess.permissions?.projectDiary ?? false,
            },
            lastLogin: now,
        };

        const { error: employeeUpdateError } = await client
            .from('employees')
            .update({ appAccess, updatedAt: now })
            .eq('id', employee.id)
            .eq('userId', companyOwnerId);

        if (employeeUpdateError) throw employeeUpdateError;

        const sessionResult = await createMobileSession({ companyOwnerId, employeeId: employee.id, platform, deviceName, appVersion });

        const employeeWithAccess = { ...employee, appAccess };
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
        console.error('[MobileAuthActivate] failed:', error);
        return NextResponse.json({ error: 'Activation failed' }, { status: 500 });
    }
}
