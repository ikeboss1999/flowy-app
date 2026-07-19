import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requireApiSession(['invoices_read', 'reports_read']);
    if (!auth.ok) return auth.response;
    const companyOwnerId = auth.companyOwnerId;

    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const client = supabaseAdmin || supabase;

    try {
        // Try calling the single aggregation RPC first for maximum performance
        const { data: rpcData, error: rpcError } = await client.rpc('get_dashboard_summary', {
            p_user_id: companyOwnerId,
            p_year: year
        });

        if (!rpcError && rpcData) {
            const summary = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
            return NextResponse.json(summary);
        }
        
        if (rpcError) {
            console.warn('[DashboardSummary] RPC get_dashboard_summary not found or failed, falling back to query aggregation. Error:', rpcError.message);
        }
    } catch (e) {
        console.warn('[DashboardSummary] Exception during RPC call, falling back to query aggregation:', e);
    }

    // Fallback: perform individual queries and aggregate in-memory
    const [invoiceResult, offerResult] = await Promise.all([
        client
            .from('invoices')
            .select('status, totalAmount')
            .eq('userId', companyOwnerId)
            .gte('issueDate', startDate)
            .lte('issueDate', endDate),
        client
            .from('offers')
            .select('status, totalAmount')
            .eq('userId', companyOwnerId)
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
