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

    const { searchParams } = new URL(request.url);
    const inquiryId = searchParams.get('inquiryId');

    if (!inquiryId) {
        return NextResponse.json({ error: 'Inquiry ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        // Verify owner first
        const { data: inquiry, error: verifyError } = await client
            .from('crm_inquiries')
            .select('userId')
            .eq('id', inquiryId)
            .single();

        if (verifyError || !inquiry || inquiry.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: notes, error } = await client
            .from('crm_inquiry_notes')
            .select('*')
            .eq('inquiryId', inquiryId)
            .order('createdAt', { ascending: false });
            
        if (error) throw error;
        return NextResponse.json(notes);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
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
        const note = payload.note || payload;
        const noteId = note.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;
        
        // Verify owner of the inquiry
        const { data: inquiry, error: verifyError } = await client
            .from('crm_inquiries')
            .select('userId')
            .eq('id', note.inquiryId)
            .single();

        if (verifyError || !inquiry || inquiry.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await client
            .from('crm_inquiry_notes')
            .upsert({
                ...note,
                id: noteId,
                createdAt: now
            });
            
        if (error) throw error;

        return NextResponse.json({ success: true, id: noteId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
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
        
        // Fetch note to verify parent inquiry owner
        const { data: note, error: noteError } = await client
            .from('crm_inquiry_notes')
            .select('inquiryId')
            .eq('id', id)
            .single();
            
        if (noteError || !note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        const { data: inquiry, error: verifyError } = await client
            .from('crm_inquiries')
            .select('userId')
            .eq('id', note.inquiryId)
            .single();

        if (verifyError || !inquiry || inquiry.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await client
            .from('crm_inquiry_notes')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }
}
