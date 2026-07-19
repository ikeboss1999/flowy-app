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

    if (!hasPermission(session, 'projects_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: projects, error } = await client
            .from('projects')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('createdAt', { ascending: false })
            .limit(500);
        if (error) throw error;
        return NextResponse.json(projects);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'projects_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        const project = payload.project || payload;

        const projectId = project.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        if (project.customerId) {
            const { data: customer, error: customerError } = await client
                .from('customers')
                .select('id,status')
                .eq('id', project.customerId)
                .eq('userId', companyOwnerId)
                .maybeSingle();

            if (customerError) throw customerError;
            if (customer?.status === 'draft') {
                return NextResponse.json({ error: 'Draft customers cannot be used for projects' }, { status: 400 });
            }
        }

        // Check if the record already exists to determine created_by
        const createdBy = project.id ? await safeGetCreatedBy(client, 'projects', project.id) : null;

        const projectData = {
            ...project,
            id: projectId,
            userId: companyOwnerId,
            updatedAt: now,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const { error } = await safeUpsert(client, 'projects', projectData);
        if (error) throw error;

        return NextResponse.json({ success: true, id: projectId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'projects_write')) {
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
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('userId', companyOwnerId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

