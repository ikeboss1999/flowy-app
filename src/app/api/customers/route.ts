import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';
import { logApiPerformance } from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

async function findDuplicateCustomerNumber(client: any, customerNumber: string, companyOwnerId: string, currentCustomerId?: string) {
    const normalizedNumber = String(customerNumber || '').trim();
    if (!normalizedNumber) return null;

    const { data, error } = await client
        .from('customers')
        .select('id,customer_number')
        .eq('userId', companyOwnerId)
        .eq('customer_number', normalizedNumber)
        .limit(2);

    if (error) throw error;
    return (data || []).find((customer: any) => customer.id !== currentCustomerId) || null;
}

export async function GET(request: Request) {
    const startedAt = performance.now();
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'customers_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: customers, error } = await client
            .from('customers')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('createdAt', { ascending: false })
            .limit(500);
        if (error) throw error;
        logApiPerformance('/api/customers', startedAt, { payload: customers });
        return NextResponse.json(customers);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'customers_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        const customer = payload.customer || payload;
        const customerId = customer.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        const duplicateCustomer = await findDuplicateCustomerNumber(client, customer.customer_number, companyOwnerId, customer.id);
        if (duplicateCustomer) {
            return NextResponse.json({ error: `Kundennummer ${customer.customer_number} ist bereits vergeben.` }, { status: 409 });
        }

        // Check if record exists for created_by
        const createdBy = customer.id ? await safeGetCreatedBy(client, 'customers', customer.id) : null;

        const customerData = {
            ...customer,
            id: customerId,
            userId: companyOwnerId,
            updatedAt: now,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const { error } = await safeUpsert(client, 'customers', customerData);
        if (error) throw error;

        return NextResponse.json({ success: true, id: customerId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'customers_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('customers')
            .delete()
            .eq('id', id)
            .eq('userId', companyOwnerId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
    }
}

