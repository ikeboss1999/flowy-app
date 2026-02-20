import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
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
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { data: projects, error } = await client
                .from('projects')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(projects);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM projects WHERE userId = ?').all(userId);
            const data = rows.map((r: any) => ({
                ...r,
                paymentPlan: r.paymentPlan ? JSON.parse(r.paymentPlan) : []
            }));
            return NextResponse.json(data);
        }
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
        // Support both { project: { ... } } and { ... }
        const project = payload.project || payload;
        const projectId = project.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('projects')
                .upsert({
                    ...project,
                    id: projectId,
                    userId, // Force userId
                    updatedAt: now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO projects 
                (id, name, customerId, description, status, address, startDate, endDate, budget, paymentPlan, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                projectId, project.name, project.customerId, project.description,
                project.status, JSON.stringify(project.address), project.startDate, project.endDate,
                project.budget, JSON.stringify(project.paymentPlan || []),
                project.createdAt || now, now, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('projects', { ...project, id: projectId, userId, updatedAt: now }, userId);
        }

        return NextResponse.json({ success: true, id: projectId });
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
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client.from('projects').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            // Check ownership for local delete
            const existing = sqliteDb.prepare('SELECT userId FROM projects WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM projects WHERE id = ? AND userId = ?').run(id, userId);

            // Silent Sync
            const client = supabaseAdmin || supabase;
            client.from('projects').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) console.error('[BackgroundSync] Project delete failed', error);
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
