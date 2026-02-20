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
            const { data: vehicles, error } = await client
                .from('vehicles')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(vehicles);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM vehicles WHERE userId = ?').all(userId);
            const data = rows.map((r: any) => ({
                ...r,
                basicInfo: JSON.parse(r.basicInfo),
                fleetDetails: JSON.parse(r.fleetDetails),
                maintenance: JSON.parse(r.maintenance),
                leasing: JSON.parse(r.leasing),
                documents: JSON.parse(r.documents)
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
        // Support both { vehicle: { ... } } and { ... }
        const vehicle = payload.vehicle || payload;
        const vehicleId = vehicle.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('vehicles')
                .upsert({
                    ...vehicle,
                    id: vehicleId,
                    userId, // Force userId
                    updatedAt: now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO vehicles 
                (id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                vehicleId, JSON.stringify(vehicle.basicInfo), JSON.stringify(vehicle.fleetDetails),
                JSON.stringify(vehicle.maintenance), JSON.stringify(vehicle.leasing),
                JSON.stringify(vehicle.documents), vehicle.createdAt || now, now, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('vehicles', { ...vehicle, id: vehicleId, userId, updatedAt: now }, userId);
        }

        return NextResponse.json({ success: true, id: vehicleId });
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
            const { error } = await client.from('vehicles').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            const existing = sqliteDb.prepare('SELECT userId FROM vehicles WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM vehicles WHERE id = ? AND userId = ?').run(id, userId);

            // Silent Sync
            const client = supabaseAdmin || supabase;
            client.from('vehicles').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) console.error('[BackgroundSync] Vehicle delete failed', error);
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
