import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';
import { writeLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { data: customers, error } = await client
                .from('customers')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(customers);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM customers WHERE userId = ?').all(userId);
            const data = rows.map((r: any) => ({
                ...r,
                address: JSON.parse(r.address)
            }));
            return NextResponse.json(data);
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        // Support both { customer: { ... } } and { ... }
        const customer = payload.customer || payload;
        const customerId = customer.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('customers')
                .upsert({
                    ...customer,
                    id: customerId,
                    userId, // Force userId from session
                    updatedAt: now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO customers 
                (id, name, email, phone, address, type, status, salutation, taxId, commercialRegisterNumber, reverseChargeEnabled, defaultPaymentTermId, notes, lastActivity, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                customerId, customer.name, customer.email, customer.phone, JSON.stringify(customer.address),
                customer.type, customer.status, customer.salutation, customer.taxId, customer.commercialRegisterNumber,
                customer.reverseChargeEnabled ? 1 : 0, customer.defaultPaymentTermId, customer.notes,
                customer.lastActivity, customer.createdAt || now, now, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('customers', { ...customer, id: customerId, userId, updatedAt: now }, session);
        }

        return NextResponse.json({ success: true, id: customerId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            // Ensure ownership
            const client = supabaseAdmin || supabase;
            const { error } = await client.from('customers').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            // Check ownership for local delete
            const existing = sqliteDb.prepare('SELECT userId FROM customers WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM customers WHERE id = ? AND userId = ?').run(id, userId);
            writeLog('CustomerAPI', `Local delete successful for ID: ${id}`);

            // Silent Sync: Use authenticated client for cloud delete
            const client = UnifiedDB.getAuthenticatedClient(session);
            client.from('customers').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) {
                    writeLog('CustomerAPI', `Cloud delete failed for ID: ${id}. Error: ${error.message}`);
                    console.error('[BackgroundSync] Customer delete failed', error);
                } else {
                    writeLog('CustomerAPI', `Cloud delete successful for ID: ${id}`);
                }
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
    }
}
