import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requireApiSession(['invoices_write', 'offers_write']);
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    try {
        const client = supabaseAdmin || supabase;
        const { data: services, error } = await client
            .from('services')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false })
            .limit(500);
        if (error) throw error;
        return NextResponse.json(services);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireApiSession(['invoices_write', 'offers_write']);
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    try {
        const payload = await request.json();
        const service = payload.service || payload;
        const serviceId = service.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('services')
            .upsert({
                ...service,
                id: serviceId,
                userId,
                updatedAt: now
            });
        if (error) throw error;

        return NextResponse.json({ success: true, id: serviceId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await requireApiSession(['invoices_write', 'offers_write']);
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('services').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
