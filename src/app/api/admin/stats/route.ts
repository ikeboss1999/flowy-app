import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const admin = await checkAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
        }

        const sqlite = getDb();

        // Default stats from local DB
        let totalUsers = (sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
        let recentUsers = sqlite.prepare('SELECT name, email, createdAt FROM users ORDER BY createdAt DESC LIMIT 5').all();

        // Try to get fresh counts from Supabase if available
        if (supabaseAdmin) {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
            if (!error && users) {
                totalUsers = users.length;
                recentUsers = users
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5)
                    .map(u => ({
                        name: u.user_metadata?.full_name || u.email?.split('@')[0],
                        email: u.email,
                        createdAt: u.created_at
                    }));
            }
        }

        const stats = {
            totalUsers,
            totalInvoices: (sqlite.prepare('SELECT COUNT(*) as count FROM invoices').get() as any).count,
            totalCustomers: (sqlite.prepare('SELECT COUNT(*) as count FROM customers').get() as any).count,
            totalRevenue: (sqlite.prepare('SELECT SUM(totalAmount) as total FROM invoices WHERE status = "bezahlt"').get() as any).total || 0,
            recentUsers,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Admin Stats GET error:', error);
        return NextResponse.json({ message: 'Serverfehler' }, { status: 500 });
    }
}
