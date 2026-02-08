import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();

        // Check main tables for ANY data
        const counts = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM invoices) +
                (SELECT COUNT(*) FROM customers) +
                (SELECT COUNT(*) FROM projects) +
                (SELECT COUNT(*) FROM employees) +
                (SELECT COUNT(*) FROM vehicles) +
                (SELECT COUNT(*) FROM settings) as total_records
        `).get() as { total_records: number };

        return NextResponse.json({
            isEmpty: !counts || counts.total_records === 0,
            recordCount: counts?.total_records || 0
        });
    } catch (error) {
        console.error("Status check failed:", error);
        return NextResponse.json({ isEmpty: false, error: "Failed to check status" }, { status: 500 });
    }
}
