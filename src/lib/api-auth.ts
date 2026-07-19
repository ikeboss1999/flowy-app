import { NextResponse } from 'next/server';
import { getUserSession, hasPermission } from '@/lib/auth-server';

export type ApiSession = NonNullable<Awaited<ReturnType<typeof getUserSession>>>;

export type ApiAuthResult =
    | {
        ok: true;
        session: ApiSession;
        actorUserId: string;
        companyOwnerId: string;
    }
    | {
        ok: false;
        response: NextResponse;
    };

export async function requireApiSession(permission?: string | string[]): Promise<ApiAuthResult> {
    const session = await getUserSession();

    if (!session?.userId || !session.companyOwnerId) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    if (permission) {
        const permissions = Array.isArray(permission) ? permission : [permission];
        const allowed = permissions.some((key) => hasPermission(session, key));

        if (!allowed) {
            return {
                ok: false,
                response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
            };
        }
    }

    return {
        ok: true,
        session,
        actorUserId: session.userId,
        companyOwnerId: session.companyOwnerId,
    };
}

export async function requireDeveloperSession(): Promise<ApiAuthResult> {
    const auth = await requireApiSession();
    if (!auth.ok) return auth;

    if (auth.session.role !== 'developer') {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        };
    }

    return auth;
}

export function productionDisabledResponse() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return null;
}
