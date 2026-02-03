import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        db.prepare('DELETE FROM services WHERE id = ?').run(params.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
