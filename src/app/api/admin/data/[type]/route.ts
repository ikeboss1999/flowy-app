import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: { type: string } }
) {
    const admin = await checkAdmin();
    if (!admin) {
        return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    }

    const { type } = params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    try {
        const client = supabaseAdmin || supabase;
        let query = client.from(type).select('*');
        if (targetUserId) {
            query = query.eq('userId', targetUserId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (e: any) {
        console.error(`Admin GET [${type}] error:`, e);
        return NextResponse.json({ error: `Failed to fetch ${type}: ${e.message}` }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { type: string } }
) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });

    const { type } = params;
    try {
        const data = await request.json();

        if (!data.userId) {
            return NextResponse.json({ error: 'User ID is required in data for global admin edits' }, { status: 400 });
        }

        const client = supabaseAdmin || supabase;
        const { error } = await client.from(type).upsert(data);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(`Admin POST [${type}] error:`, e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { type: string } }
) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });

    const { type } = params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from(type).delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(`Admin DELETE [${type}] error:`, e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
