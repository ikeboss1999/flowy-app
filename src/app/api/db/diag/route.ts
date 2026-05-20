import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getUserSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const report = {
            status: 'Diagnostic Report',
            timestamp: new Date().toISOString(),
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                platform: process.platform,
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
                supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
                adminKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'
            },
            auth: {
                userId: session.userId,
                role: session.role
            }
        };

        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
