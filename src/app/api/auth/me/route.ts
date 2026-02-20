import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getUserSession();

        if (!session) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        return NextResponse.json({
            user: {
                id: session.userId,
                name: session.name || session.email?.split('@')[0],
                email: session.email,
                role: session.role
            }
        }, { status: 200 });
    } catch (error) {
        console.error('[API Auth Me] GET Error:', error);
        return NextResponse.json({ user: null }, { status: 200 });
    }
}
