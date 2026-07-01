import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';

export const dynamic = 'force-dynamic';

const invoiceMutableAfterFinalization = [
    'status',
    'paidAmount',
    'paymentDeviation',
    'dunningLevel',
    'lastDunningDate',
    'dunningHistory',
];

function pickMutableInvoiceFields(invoice: any) {
    return invoiceMutableAfterFinalization.reduce((fields, key) => {
        if (Object.prototype.hasOwnProperty.call(invoice, key)) {
            fields[key] = invoice[key];
        }
        return fields;
    }, {} as Record<string, any>);
}

function isStoredInvoicePdfReference(invoice: any, companyOwnerId: string) {
    const reference = invoice.pdfPath || invoice.pdfUrl;
    if (!reference || typeof reference !== 'string') return false;
    if (!reference.startsWith('http')) return reference.startsWith(`${companyOwnerId}/`);

    try {
        const url = new URL(reference);
        return url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL
            && url.pathname.includes('/storage/v1/object/public/invoices/');
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'invoices_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: invoices, error } = await client
            .from('invoices')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('issueDate', { ascending: false })
            .limit(500);
        if (error) throw error;
        return NextResponse.json(invoices);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'invoices_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        const invoice = payload.invoice || payload;
        const invoiceId = invoice.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        const { data: existingInvoice, error: existingError } = invoice.id
            ? await client
                .from('invoices')
                .select('*')
                .eq('id', invoice.id)
                .eq('userId', companyOwnerId)
                .maybeSingle()
            : { data: null, error: null };

        if (existingError) throw existingError;

        // Check if record exists for created_by
        const createdBy = existingInvoice?.created_by || (invoice.id ? await safeGetCreatedBy(client, 'invoices', invoice.id) : null);

        if (existingInvoice && existingInvoice.status !== 'draft') {
            if (invoice.status === 'draft') {
                if (session.role !== 'admin' && session.role !== 'developer') {
                    return NextResponse.json({ error: 'Only admins can reopen finalized invoices' }, { status: 403 });
                }

                const reopenData = {
                    ...existingInvoice,
                    status: 'draft',
                    updatedAt: now,
                    updated_by: session.userId,
                    created_by: createdBy || existingInvoice.created_by || session.userId
                };

                const result = await safeUpsert(client, 'invoices', reopenData);
                if (result.error) {
                    console.error('SUPABASE UPSERT ERROR:', result.error);
                    throw result.error;
                }

                return NextResponse.json({ success: true, id: invoiceId });
            }

            const mutableInvoiceData = {
                ...existingInvoice,
                ...pickMutableInvoiceFields(invoice),
                id: existingInvoice.id,
                userId: companyOwnerId,
                updatedAt: now,
                updated_by: session.userId,
                created_by: createdBy || existingInvoice.created_by || session.userId
            };

            const result = await safeUpsert(client, 'invoices', mutableInvoiceData);
            if (result.error) {
                console.error('SUPABASE UPSERT ERROR:', result.error);
                throw result.error;
            }

            return NextResponse.json({ success: true, id: invoiceId });
        }

        if (invoice.status !== 'draft' && !isStoredInvoicePdfReference(invoice, companyOwnerId)) {
            return NextResponse.json({ error: 'Finalized invoices require a stored PDF' }, { status: 400 });
        }

        const invoiceData = {
            ...invoice,
            id: invoiceId,
            userId: companyOwnerId,
            updatedAt: now,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const result = await safeUpsert(client, 'invoices', invoiceData);
        if (result.error) {
            console.error('SUPABASE UPSERT ERROR:', result.error);
            throw result.error;
        }

        return NextResponse.json({ success: true, id: invoiceId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'invoices_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: existingInvoice, error: fetchError } = await client
            .from('invoices')
            .select('id, status')
            .eq('id', id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existingInvoice) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (existingInvoice.status !== 'draft') {
            return NextResponse.json({ error: 'Finalized invoices cannot be deleted' }, { status: 403 });
        }

        const { error } = await client
            .from('invoices')
            .delete()
            .eq('id', id)
            .eq('userId', companyOwnerId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

