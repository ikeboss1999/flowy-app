import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getUserSession();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const client = supabaseAdmin || supabase;

    const [invoiceResult, offerResult] = await Promise.all([
        client
            .from('invoices')
            .select('status, totalAmount')
            .eq('userId', session.userId)
            .gte('issueDate', startDate)
            .lte('issueDate', endDate),
        client
            .from('offers')
            .select('status, totalAmount')
            .eq('userId', session.userId)
            .gte('issueDate', startDate)
            .lte('issueDate', endDate),
    ]);

    if (invoiceResult.error) return NextResponse.json({ error: invoiceResult.error.message }, { status: 500 });
    if (offerResult.error) return NextResponse.json({ error: offerResult.error.message }, { status: 500 });

    const invoices = invoiceResult.data ?? [];
    const offers = offerResult.data ?? [];

    return NextResponse.json({
        year,
        totalRevenue: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0),
        openAmount: invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0),
        openInvoicesCount: invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length,
        openOffersCount: offers.filter(o => o.status === 'sent').length,
        openOffersAmount: offers.filter(o => o.status === 'sent').reduce((s, o) => s + o.totalAmount, 0),
    });
}
