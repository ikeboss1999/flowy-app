import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const auth = await requireApiSession('calendar_use');
    if (!auth.ok) return auth.response;
    const userId = auth.companyOwnerId;
    const { id } = params;

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('calendar_events').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
