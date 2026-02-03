import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// GET all vehicles for a user
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ message: 'Missing userId' }, { status: 400 });
    }

    try {
        const vehicles = db.prepare('SELECT * FROM vehicles WHERE userId = ? ORDER BY createdAt DESC').all(userId);

        // Parse JSON strings back to objects
        const parsedVehicles = vehicles.map((v: any) => ({
            ...v,
            basicInfo: JSON.parse(v.basicInfo),
            fleetDetails: JSON.parse(v.fleetDetails),
            maintenance: JSON.parse(v.maintenance),
            leasing: v.leasing ? JSON.parse(v.leasing) : null,
            documents: v.documents ? JSON.parse(v.documents) : []
        }));

        return NextResponse.json(parsedVehicles);
    } catch (error) {
        console.error('Failed to fetch vehicles:', error);
        return NextResponse.json({ message: 'Failed to fetch vehicles' }, { status: 500 });
    }
}

// POST create or update a vehicle
export async function POST(request: Request) {
    try {
        const { userId, vehicle } = await request.json();

        if (!userId || !vehicle) {
            return NextResponse.json({ message: 'Missing userId or vehicle' }, { status: 400 });
        }

        const { id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt } = vehicle;
        const vehicleId = id || nanoid();
        const now = new Date().toISOString();

        // Check if vehicle exists
        const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(vehicleId);

        if (existing) {
            db.prepare(`
                UPDATE vehicles 
                SET basicInfo = ?, fleetDetails = ?, maintenance = ?, leasing = ?, documents = ?, userId = ?
                WHERE id = ?
            `).run(
                JSON.stringify(basicInfo),
                JSON.stringify(fleetDetails),
                JSON.stringify(maintenance),
                JSON.stringify(leasing),
                JSON.stringify(documents),
                userId,
                vehicleId
            );
        } else {
            db.prepare(`
                INSERT INTO vehicles (id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                vehicleId,
                JSON.stringify(basicInfo),
                JSON.stringify(fleetDetails),
                JSON.stringify(maintenance),
                JSON.stringify(leasing),
                JSON.stringify(documents),
                createdAt || now,
                userId
            );
        }

        return NextResponse.json({ message: 'Vehicle saved successfully', id: vehicleId });
    } catch (error) {
        console.error('Failed to save vehicle:', error);
        return NextResponse.json({ message: 'Failed to save vehicle' }, { status: 500 });
    }
}
