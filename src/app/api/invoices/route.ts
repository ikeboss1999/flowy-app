import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { Invoice } from '@/types/invoice';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('SELECT * FROM invoices WHERE userId = ?');
        const rows = stmt.all(userId);

        const invoices = rows.map((row: any) => ({
            ...row,
            items: JSON.parse(row.items),
            performancePeriod: {
                from: row.perfFrom,
                to: row.perfTo
            },
            previousInvoices: row.previousInvoices ? JSON.parse(row.previousInvoices) : [],
            dunningHistory: row.dunningHistory ? JSON.parse(row.dunningHistory) : [],
            paymentDeviation: row.paymentDeviation ? JSON.parse(row.paymentDeviation) : null,
            isReverseCharge: row.isReverseCharge === 1
        }));

        return NextResponse.json(invoices);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const invoice: Invoice = await request.json();

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO invoices 
            (id, invoiceNumber, customerId, projectId, billingType, issueDate, items, subtotal, taxRate, taxAmount, totalAmount, isReverseCharge, status, paymentTerms, perfFrom, perfTo, processor, subjectExtra, partialPaymentNumber, createdAt, updatedAt, userId, previousInvoices, dunningLevel, lastDunningDate, dunningHistory, paidAmount, paymentDeviation, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            invoice.id,
            invoice.invoiceNumber,
            invoice.customerId,
            invoice.projectId,
            invoice.billingType,
            invoice.issueDate,
            JSON.stringify(invoice.items),
            invoice.subtotal,
            invoice.taxRate,
            invoice.taxAmount,
            invoice.totalAmount,
            invoice.isReverseCharge ? 1 : 0,
            invoice.status,
            invoice.paymentTerms,
            invoice.performancePeriod?.from || null,
            invoice.performancePeriod?.to || null,
            invoice.processor,
            invoice.subjectExtra,
            invoice.partialPaymentNumber,
            invoice.createdAt,
            invoice.updatedAt,
            invoice.userId,
            JSON.stringify(invoice.previousInvoices || []),
            invoice.dunningLevel || 0,
            invoice.lastDunningDate || null,
            JSON.stringify(invoice.dunningHistory || []),
            invoice.paidAmount || 0,
            JSON.stringify(invoice.paymentDeviation || null),
            invoice.notes || null
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save invoice' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('DELETE FROM invoices WHERE id = ?');
        stmt.run(id);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }
}
