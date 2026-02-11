import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { Customer } from '@/types/customer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            // Direct Cloud Read
            const { data: customers, error } = await supabase
                .from('customers')
                .select('*')
                .eq('userId', userId);

            if (error) throw error;
            return NextResponse.json(customers);
        } else {
            // Fast Local Read
            const stmt = sqliteDb.prepare('SELECT * FROM customers WHERE userId = ?');
            const rows = stmt.all(userId);

            const customers = rows.map((row: any) => ({
                ...row,
                address: JSON.parse(row.address),
                reverseChargeEnabled: row.reverseChargeEnabled === 1
            }));

            return NextResponse.json(customers);
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const customer: Customer = await request.json();
        const userId = customer.userId;

        if (isWeb) {
            // Direct Cloud Write
            const { error } = await supabase
                .from('customers')
                .upsert({
                    ...customer,
                    address: customer.address // Supabase handles JSONB objects
                });
            if (error) throw error;
        } else {
            // Fast Local Write
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO customers 
                (id, name, email, phone, address, type, status, salutation, taxId, commercialRegisterNumber, reverseChargeEnabled, defaultPaymentTermId, notes, lastActivity, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                customer.id,
                customer.name,
                customer.email,
                customer.phone,
                JSON.stringify(customer.address),
                customer.type,
                customer.status,
                customer.salutation,
                customer.taxId,
                customer.commercialRegisterNumber,
                customer.reverseChargeEnabled ? 1 : 0,
                customer.defaultPaymentTermId,
                customer.notes,
                customer.lastActivity,
                customer.createdAt,
                customer.updatedAt,
                customer.userId
            );

            // Stiller Hintergrund-Sync
            UnifiedDB.syncToCloud('customers', customer, userId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId'); // Added for cloud delete

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id as string);
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare('DELETE FROM customers WHERE id = ?');
            stmt.run(id);

            // Silent cloud sync for delete
            if (userId) {
                // Execute and catch error
                supabase.from('customers').delete().eq('id', id as string).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
    }
}
