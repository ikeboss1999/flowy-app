import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        if (isWeb) {
            const { data: services, error } = await supabase
                .from('services')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(services);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM services WHERE userId = ?').all(userId);
            return NextResponse.json(rows.map((row: any) => ({
                ...row,
                title: row.name // Map DB name back to Frontend title
            })));
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, service } = await request.json();
        const { id, title, description, category, price, unit } = service;

        const serviceId = id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const { error } = await supabase
                .from('services')
                .upsert({
                    id: serviceId,
                    name: title,
                    title: title,
                    description,
                    category,
                    price,
                    unit,
                    userId,
                    createdAt: service.createdAt || now,
                    updatedAt: now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO services 
                (id, name, title, description, category, price, unit, userId, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                serviceId, title, title, description, category, price, unit,
                userId, service.createdAt || now, now
            );

            // Silent Sync
            UnifiedDB.syncToCloud('services', { ...service, id: serviceId, name: title }, userId);
        }

        return NextResponse.json({ success: true, id: serviceId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        if (isWeb) {
            const { error } = await supabase.from('services').delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare('DELETE FROM services WHERE id = ?').run(id);

            if (userId) {
                supabase.from('services').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Service delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
