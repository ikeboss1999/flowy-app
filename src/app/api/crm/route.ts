import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'crm_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: inquiries, error } = await client
            .from('crm_inquiries')
            .select('*')
            .eq('userId', companyOwnerId)
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
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'crm_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        const inquiry = payload.inquiry || payload;
        const inquiryId = inquiry.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        // Check if record exists for created_by
        const createdBy = inquiry.id ? await safeGetCreatedBy(client, 'crm_inquiries', inquiry.id) : null;

        const inquiryData = {
            ...inquiry,
            id: inquiryId,
            userId: companyOwnerId,
            updatedAt: now,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const { error } = await safeUpsert(client, 'crm_inquiries', inquiryData);
        if (error) throw error;

        return NextResponse.json({ success: true, id: inquiryId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'crm_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
            .eq('userId', companyOwnerId);
            
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete inquiry' }, { status: 500 });
    }
}

