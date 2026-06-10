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
        const { data: inquiries, error } = await client
            .from('crm_inquiries')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });
            
        if (error) throw error;
        return NextResponse.json(inquiries);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
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
        const inquiry = payload.inquiry || payload;
        const inquiryId = inquiry.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('crm_inquiries')
            .upsert({
                ...inquiry,
                id: inquiryId,
                userId,
                updatedAt: now
            });
            
        if (error) throw error;

        return NextResponse.json({ success: true, id: inquiryId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500 });
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
        const { error } = await client
            .from('crm_inquiries')
            .delete()
            .eq('id', id)
            .eq('userId', userId);
            
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete inquiry' }, { status: 500 });
    }
}
