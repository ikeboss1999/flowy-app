import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import {
    buildRefreshToken,
    generateRefreshSecret,
    getEmployeeForMobile,
    getMobileClient,
    getRefreshExpiry,
    issueMobileTokens,
    parseRefreshToken,
    sanitizeMobileEmployee,
} from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

const refreshSchema = z.object({
    refreshToken: z.string().trim().min(20).max(300),
    platform: z.string().trim().max(40).optional(),
    deviceName: z.string().trim().max(120).optional(),
    appVersion: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
    const parsed = await parseJsonBody(request, refreshSchema);
    if (!parsed.ok) return parsed.response;

    const tokenParts = parseRefreshToken(parsed.data.refreshToken);
    if (!tokenParts) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const client = getMobileClient();
        const now = new Date().toISOString();
        const { data: session, error } = await client
            .from('employee_mobile_sessions')
            .select('*')
            .eq('id', tokenParts.sessionId)
            .is('revokedAt', null)
            .gt('expiresAt', now)
            .maybeSingle();

        if (error) throw error;
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const isRefreshValid = await bcrypt.compare(tokenParts.secret, session.refreshTokenHash);
        if (!isRefreshValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const employee = await getEmployeeForMobile(client, session.employeeId, session.userId);
        if (!employee?.appAccess?.isAccessEnabled || employee.employment?.isActive === false) {
            await client
                .from('employee_mobile_sessions')
                .update({ revokedAt: now, updatedAt: now })
                .eq('id', session.id);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const newRefreshSecret = generateRefreshSecret();
        const newRefreshTokenHash = await bcrypt.hash(newRefreshSecret, 10);
        const newRefreshExpiresAt = getRefreshExpiry();

        const { error: updateError } = await client
            .from('employee_mobile_sessions')
            .update({
                refreshTokenHash: newRefreshTokenHash,
                platform: parsed.data.platform || session.platform,
                deviceName: parsed.data.deviceName || session.deviceName,
                appVersion: parsed.data.appVersion || session.appVersion,
                lastSeenAt: now,
                expiresAt: newRefreshExpiresAt,
                updatedAt: now,
            })
            .eq('id', session.id)
            .eq('userId', session.userId)
            .eq('employeeId', session.employeeId)
            .is('revokedAt', null);

        if (updateError) throw updateError;

        const tokens = await issueMobileTokens({
            companyOwnerId: session.userId,
            employee,
            sessionId: session.id,
        });

        return NextResponse.json({
            success: true,
            ...tokens,
            refreshToken: buildRefreshToken(session.id, newRefreshSecret),
            refreshTokenExpiresAt: newRefreshExpiresAt,
            employee: await sanitizeMobileEmployee(employee, client, session.userId),
        });
    } catch (error) {
        console.error('[MobileAuthRefresh] failed:', error);
        return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
    }
}
