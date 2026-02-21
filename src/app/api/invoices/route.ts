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
            const { data: invoices, error } = await client
                .from('invoices')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(invoices);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM invoices WHERE userId = ?').all(userId);
            const data = rows.map((r: any) => ({
                ...r,
                performancePeriod: {
                    from: r.perfFrom,
                    to: r.perfTo
                },
                items: JSON.parse(r.items),
                dunningHistory: r.dunningHistory ? JSON.parse(r.dunningHistory) : [],
                previousInvoices: r.previousInvoices ? JSON.parse(r.previousInvoices) : []
            }));
            return NextResponse.json(data);
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
        // Support both { invoice: { ... } } and { ... }
        const invoice = payload.invoice || payload;
        const invoiceId = invoice.id || nanoid();
        const now = new Date().toISOString();

        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('invoices')
                .upsert({
                    ...invoice,
                    id: invoiceId,
                    userId, // Force userId from session
                    updatedAt: now
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO invoices 
                (id, invoiceNumber, customerId, projectId, constructionProject, paymentPlanItemId, billingType, issueDate, items, subtotal, taxRate, taxAmount, totalAmount, isReverseCharge, status, paymentTerms, perfFrom, perfTo, processor, subjectExtra, partialPaymentNumber, previousInvoices, dunningLevel, lastDunningDate, dunningHistory, paidAmount, paymentDeviation, notes, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const perfFrom = invoice.perfFrom || invoice.performancePeriod?.from;
            const perfTo = invoice.perfTo || invoice.performancePeriod?.to;

            stmt.run(
                invoiceId, invoice.invoiceNumber, invoice.customerId, invoice.projectId, invoice.constructionProject,
                invoice.paymentPlanItemId, invoice.billingType, invoice.issueDate, JSON.stringify(invoice.items),
                invoice.subtotal, invoice.taxRate, invoice.taxAmount, invoice.totalAmount,
                invoice.isReverseCharge ? 1 : 0, invoice.status, invoice.paymentTerms, perfFrom, perfTo,
                invoice.processor, invoice.subjectExtra, invoice.partialPaymentNumber,
                JSON.stringify(invoice.previousInvoices || []), invoice.dunningLevel || 0,
                invoice.lastDunningDate, JSON.stringify(invoice.dunningHistory || []),
                invoice.paidAmount || 0, invoice.paymentDeviation || 0, invoice.notes,
                invoice.createdAt || now, now, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('invoices', {
                ...invoice,
                id: invoiceId,
                userId,
                updatedAt: now,
                perfFrom,
                perfTo
            }, session);
        }

        return NextResponse.json({ success: true, id: invoiceId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
            const { error } = await client.from('invoices').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            // Check ownership for local delete
            const existing = sqliteDb.prepare('SELECT userId FROM invoices WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM invoices WHERE id = ? AND userId = ?').run(id, userId);
            writeLog('InvoiceAPI', `Local delete successful for ID: ${id}`);

            // Silent Sync
            const client = UnifiedDB.getAuthenticatedClient(session);
            client.from('invoices').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) {
                    writeLog('InvoiceAPI', `Cloud delete failed for ID: ${id}. Error: ${error.message}`);
                    console.error('[BackgroundSync] Invoice delete failed', error);
                } else {
                    writeLog('InvoiceAPI', `Cloud delete successful for ID: ${id}`);
                }
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
