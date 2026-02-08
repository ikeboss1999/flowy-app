import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST() {
    try {
        const db = getDb();

        // Transaction to wipe all data
        const wipe = db.transaction(() => {
            // Delete content of all value tables
            // Keep structure, just remove data
            db.prepare("DELETE FROM invoices").run();
            db.prepare("DELETE FROM invoice_items").run();
            db.prepare("DELETE FROM customers").run();
            db.prepare("DELETE FROM employees").run();
            db.prepare("DELETE FROM employees").run();
            db.prepare("DELETE FROM settings").run();
            db.prepare("DELETE FROM vehicles").run();
            db.prepare("DELETE FROM vehicles").run();
            db.prepare("DELETE FROM time_entries").run();
            db.prepare("DELETE FROM materials").run(); // If exists
        });

        wipe();

        return NextResponse.json({ success: true, message: "Database wiped successfully" });
    } catch (error) {
        console.error("Wipe failed:", error);
        return NextResponse.json({ success: false, error: "Failed to wipe database" }, { status: 500 });
    }
}
