import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { Invoice } from '@/types/invoice';

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
            const { data: invoices, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('userId', userId);

            if (error) throw error;
            return NextResponse.json(invoices);
        } else {
            // Fast Local Read
            const stmt = sqliteDb.prepare('SELECT * FROM invoices WHERE userId = ?');
            const rows = stmt.all(userId);

            const invoices = rows.map((row: any) => ({
                ...row,
                items: JSON.parse(row.items || '[]'),
                performancePeriod: {
                    from: row.perfFrom,
                    to: row.perfTo
                },
                previousInvoices: JSON.parse(row.previousInvoices || '[]'),
                dunningHistory: JSON.parse(row.dunningHistory || '[]'),
                paymentDeviation: row.paymentDeviation ? JSON.parse(row.paymentDeviation) : null,
                isReverseCharge: row.isReverseCharge === 1,
            }));

            return NextResponse.json(invoices);
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const invoice: Invoice = await request.json();
        const userId = invoice.userId;

        if (isWeb) {
            // Direct Cloud Write
            const { error } = await supabase
                .from('invoices')
                .upsert({
                    ...invoice,
                    // Supabase handles JSONB objects directly
                });
            if (error) throw error;
        } else {
            // Fast Local Write
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO invoices (id, invoiceNumber, customerId, projectId, constructionProject, paymentPlanItemId, billingType, issueDate, items, subtotal, taxRate, taxAmount, totalAmount, isReverseCharge, status, paymentTerms, perfFrom, perfTo, processor, subjectExtra, partialPaymentNumber, previousInvoices, dunningLevel, lastDunningDate, dunningHistory, paidAmount, paymentDeviation, notes, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                invoice.id,
                invoice.invoiceNumber,
                invoice.customerId,
                invoice.projectId || null,
                invoice.constructionProject || null,
                invoice.paymentPlanItemId || null,
                invoice.billingType || 'standard',
                invoice.issueDate,
                JSON.stringify(invoice.items || []),
                invoice.subtotal,
                invoice.taxRate,
                invoice.taxAmount,
                invoice.totalAmount,
                invoice.isReverseCharge ? 1 : 0,
                invoice.status,
                invoice.paymentTerms || null,
                invoice.performancePeriod?.from || null,
                invoice.performancePeriod?.to || null,
                invoice.processor || null,
                invoice.subjectExtra || null,
                invoice.partialPaymentNumber || null,
                JSON.stringify(invoice.previousInvoices || []),
                invoice.dunningLevel || 0,
                invoice.lastDunningDate || null,
                JSON.stringify(invoice.dunningHistory || []),
                invoice.paidAmount || 0,
                JSON.stringify(invoice.paymentDeviation || null),
                invoice.notes || null,
                invoice.createdAt,
                invoice.updatedAt,
                invoice.userId
            );

            // Stiller Hintergrund-Sync
            UnifiedDB.syncToCloud('invoices', invoice, userId);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Invoice save error:', e);
        return NextResponse.json({ error: 'Failed to save invoice' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        if (isWeb) {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id as string);
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare('DELETE FROM invoices WHERE id = ?');
            stmt.run(id);

            // Silent cloud sync for delete
            if (userId) {
                supabase.from('invoices').delete().eq('id', id as string).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }
}
