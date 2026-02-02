import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { Customer } from '@/types/customer';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('SELECT * FROM customers WHERE userId = ?');
        const rows = stmt.all(userId);

        const customers = rows.map((row: any) => ({
            ...row,
            address: JSON.parse(row.address)
        }));

        return NextResponse.json(customers);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const customer: Customer = await request.json();

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO customers 
            (id, name, email, phone, address, createdAt, updatedAt, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            customer.id,
            customer.name,
            customer.email,
            customer.phone,
            JSON.stringify(customer.address),
            customer.createdAt,
            customer.updatedAt,
            customer.userId
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
        stmt.run(id);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
    }
}
