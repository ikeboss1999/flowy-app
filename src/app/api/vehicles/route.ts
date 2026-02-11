import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ message: 'Missing userId' }, { status: 400 });
    }

    try {
        if (isWeb) {
            const { data: vehicles, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(vehicles);
        } else {
            const vehicles = sqliteDb.prepare('SELECT * FROM vehicles WHERE userId = ? ORDER BY createdAt DESC').all(userId);

            const parsedVehicles = vehicles.map((v: any) => ({
                ...v,
                basicInfo: JSON.parse(v.basicInfo),
                fleetDetails: JSON.parse(v.fleetDetails),
                maintenance: JSON.parse(v.maintenance),
                leasing: v.leasing ? JSON.parse(v.leasing) : null,
                documents: v.documents ? JSON.parse(v.documents) : []
            }));

            return NextResponse.json(parsedVehicles);
        }
    } catch (error) {
        console.error('Failed to fetch vehicles:', error);
        return NextResponse.json({ message: 'Failed to fetch vehicles' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, vehicle } = await request.json();

        if (!userId || !vehicle) {
            return NextResponse.json({ message: 'Missing userId or vehicle' }, { status: 400 });
        }

        const { id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt } = vehicle;
        const vehicleId = id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const { error } = await supabase
                .from('vehicles')
                .upsert({
                    id: vehicleId,
                    basicInfo,
                    fleetDetails,
                    maintenance,
                    leasing,
                    documents,
                    createdAt: createdAt || now,
                    userId
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO vehicles (id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                vehicleId,
                JSON.stringify(basicInfo),
                JSON.stringify(fleetDetails),
                JSON.stringify(maintenance),
                JSON.stringify(leasing),
                JSON.stringify(documents),
                createdAt || now,
                userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('vehicles', { ...vehicle, id: vehicleId }, userId);
        }

        return NextResponse.json({ message: 'Vehicle saved successfully', id: vehicleId });
    } catch (error) {
        console.error('Failed to save vehicle:', error);
        return NextResponse.json({ message: 'Failed to save vehicle' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        if (isWeb) {
            const { error } = await supabase.from('vehicles').delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare('DELETE FROM vehicles WHERE id = ?').run(id);

            if (userId) {
                supabase.from('vehicles').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Vehicle delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
