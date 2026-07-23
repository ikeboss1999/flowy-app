import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api-validation';
import { getMobileClient, parseRefreshToken, requireMobileSession } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

const logoutSchema = z.object({
    refreshToken: z.string().trim().min(20).max(300).optional(),
});

export async function POST(request: Request) {
    const parsed = await parseJsonBody(request, logoutSchema);
    if (!parsed.ok) return parsed.response;

    try {
        const client = getMobileClient();
        const now = new Date().toISOString();
        const tokenParts = parsed.data.refreshToken ? parseRefreshToken(parsed.data.refreshToken) : null;

        if (tokenParts) {
            const { data: session, error: sessionError } = await client
                .from('employee_mobile_sessions')
                .select('id,refreshTokenHash')
                .eq('id', tokenParts.sessionId)
                .is('revokedAt', null)
                .maybeSingle();

            if (sessionError) throw sessionError;
            if (!session) return NextResponse.json({ success: true });

            const isRefreshValid = await bcrypt.compare(tokenParts.secret, session.refreshTokenHash);
            if (!isRefreshValid) return NextResponse.json({ success: true });

            await client
                .from('employee_mobile_sessions')
                .update({ revokedAt: now, updatedAt: now })
                .eq('id', session.id)
                .is('revokedAt', null);
            return NextResponse.json({ success: true });
        }

        const auth = await requireMobileSession(request);
        if (!auth.ok) return auth.response;

        await client
            .from('employee_mobile_sessions')
            .update({ revokedAt: now, updatedAt: now })
            .eq('id', auth.session.id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', auth.employeeId)
            .is('revokedAt', null);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[MobileAuthLogout] failed:', error);
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
}
