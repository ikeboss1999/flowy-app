import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';

// DELETE a specific vehicle
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id;

    if (!id) {
        return NextResponse.json({ message: 'Missing vehicle ID' }, { status: 400 });
    }

    try {
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error('Failed to delete vehicle:', error);
        return NextResponse.json({ message: 'Failed to delete vehicle' }, { status: 500 });
    }
}
