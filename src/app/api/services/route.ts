import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';
import { writeLog } from '@/lib/logger';

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
            const { data: services, error } = await client
                .from('services')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(services);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM services WHERE userId = ?').all(userId);
            return NextResponse.json(rows);
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
        // Support both { service: { ... } } and { ... }
        const service = payload.service || payload;
        const serviceId = service.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('services')
                .upsert({
                    ...service,
                    id: serviceId,
                    userId, // Force userId
                    updatedAt: now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO services 
                (id, name, title, description, category, price, unit, userId, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const serviceName = service.name || service.title;

            stmt.run(
                serviceId, serviceName, service.title, service.description,
                service.category, service.price, service.unit, userId,
                service.createdAt || now, now
            );

            // Silent Sync
            UnifiedDB.syncToCloud('services', { ...service, name: serviceName, id: serviceId, userId, updatedAt: now }, session);
        }

        return NextResponse.json({ success: true, id: serviceId });
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
            const { error } = await client.from('services').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            const existing = sqliteDb.prepare('SELECT userId FROM services WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM services WHERE id = ? AND userId = ?').run(id, userId);
            writeLog('ServiceAPI', `Local delete successful for ID: ${id}`);

            // Silent Sync
            const client = UnifiedDB.getAuthenticatedClient(session);
            client.from('services').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) {
                    writeLog('ServiceAPI', `Cloud delete failed for ID: ${id}. Error: ${error.message}`);
                    console.error('[BackgroundSync] Service delete failed', error);
                } else {
                    writeLog('ServiceAPI', `Cloud delete successful for ID: ${id}`);
                }
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
