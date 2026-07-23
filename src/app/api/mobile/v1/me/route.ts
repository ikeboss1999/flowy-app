import { NextResponse } from 'next/server';
import { requireMobileSession, sanitizeMobileEmployee } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const auth = await requireMobileSession(request);
        if (!auth.ok) return auth.response;

        const employee = await sanitizeMobileEmployee(auth.employee, auth.client, auth.companyOwnerId);

        return NextResponse.json({
            employee: {
                ...employee,
                appAccess: {
                    ...employee.appAccess,
                    permissions: auth.permissions,
                },
            },
            permissions: auth.permissions,
            session: {
                id: auth.session.id,
                platform: auth.session.platform,
                deviceName: auth.session.deviceName,
                appVersion: auth.session.appVersion,
                lastSeenAt: auth.session.lastSeenAt,
                expiresAt: auth.session.expiresAt,
            },
        });
    } catch (error) {
        console.error('[MobileMe] failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile profile' }, { status: 500 });
    }
}
