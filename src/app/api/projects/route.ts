import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { Project } from '@/types/project';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            const { data: projects, error } = await supabase
                .from('projects')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(projects);
        } else {
            const stmt = sqliteDb.prepare('SELECT * FROM projects WHERE userId = ?');
            const rows = stmt.all(userId);

            const projects = rows.map((row: any) => ({
                ...row,
                address: JSON.parse(row.address),
                paymentPlan: row.paymentPlan ? JSON.parse(row.paymentPlan) : []
            }));

            return NextResponse.json(projects);
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const project: Project = await request.json();
        const userId = project.userId;

        if (isWeb) {
            const { error } = await supabase
                .from('projects')
                .upsert(project);
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO projects 
                (id, name, customerId, description, status, address, startDate, endDate, budget, paymentPlan, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                project.id,
                project.name,
                project.customerId,
                project.description,
                project.status,
                JSON.stringify(project.address),
                project.startDate,
                project.endDate,
                project.budget,
                JSON.stringify(project.paymentPlan || []),
                project.createdAt,
                project.updatedAt,
                project.userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('projects', project, userId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            const { error } = await supabase.from('projects').delete().eq('id', id as string);
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare('DELETE FROM projects WHERE id = ?');
            stmt.run(id);

            if (userId) {
                supabase.from('projects').delete().eq('id', id as string).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Project delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}
