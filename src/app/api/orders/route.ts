import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: orders, error } = await client
            .from('order_confirmations')
            .select('*')
            .eq('userId', userId)
            .order('issueDate', { ascending: false })
            .limit(500);
        if (error) throw error;
        return NextResponse.json(orders);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const orderId = payload.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const result = await client
            .from('order_confirmations')
            .upsert({
                ...payload,
                id: orderId,
                userId,
                updatedAt: now
            });
        if (result.error) {
            console.error('SUPABASE UPSERT ERROR:', result.error);
            throw result.error;
        }

        return NextResponse.json({ success: true, id: orderId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('order_confirmations').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
