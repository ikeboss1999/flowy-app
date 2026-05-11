import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const admin = await checkAdmin();
        if (!admin) {
            return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
        }

        const client = supabaseAdmin || supabase;

        const [usersResult, invoicesResult, customersResult] = await Promise.all([
            supabaseAdmin
                ? supabaseAdmin.auth.admin.listUsers()
                : Promise.resolve({ data: { users: [] }, error: null }),
            client.from('invoices').select('id, totalAmount, status', { count: 'exact' }),
            client.from('customers').select('id', { count: 'exact' })
        ]);

        const users = usersResult.data?.users || [];
        const recentUsers = [...users]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map(u => ({
                name: u.user_metadata?.full_name || u.email?.split('@')[0],
                email: u.email,
                createdAt: u.created_at
            }));

        const paidInvoices = (invoicesResult.data || []).filter(i => i.status === 'bezahlt' || i.status === 'paid');
        const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

        const stats = {
            totalUsers: users.length,
            totalInvoices: invoicesResult.count || 0,
            totalCustomers: customersResult.count || 0,
            totalRevenue,
            recentUsers,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Admin Stats GET error:', error);
        return NextResponse.json({ message: 'Serverfehler' }, { status: 500 });
    }
}
