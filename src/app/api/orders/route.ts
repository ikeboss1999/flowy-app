import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';

export const dynamic = 'force-dynamic';

const orderMutableAfterFinalization = ['status'];

function pickMutableOrderFields(order: any) {
    return orderMutableAfterFinalization.reduce((fields, key) => {
        if (Object.prototype.hasOwnProperty.call(order, key)) {
            fields[key] = order[key];
        }
        return fields;
    }, {} as Record<string, any>);
}

function isStoredOrderPdfReference(order: any, companyOwnerId: string) {
    const reference = order.pdfPath || order.pdfUrl;
    if (!reference || typeof reference !== 'string') return false;
    if (!reference.startsWith('http')) return reference.startsWith(`${companyOwnerId}/`);

    try {
        const url = new URL(reference);
        return url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL
            && url.pathname.includes('/storage/v1/object/public/orders/');
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

    if (!hasPermission(session, 'orders_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: orders, error } = await client
            .from('order_confirmations')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('issueDate', { ascending: false })
            .limit(500);
        if (error) throw error;
        return NextResponse.json(orders);
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

    if (!hasPermission(session, 'orders_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        const orderId = payload.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        const { data: existingOrder, error: existingError } = payload.id
            ? await client
                .from('order_confirmations')
                .select('*')
                .eq('id', payload.id)
                .eq('userId', companyOwnerId)
                .maybeSingle()
            : { data: null, error: null };

        if (existingError) throw existingError;

        // Check if record exists for created_by
        const createdBy = existingOrder?.created_by || (payload.id ? await safeGetCreatedBy(client, 'order_confirmations', payload.id) : null);

        if (existingOrder) {
            const mutableOrderData = {
                ...existingOrder,
                ...pickMutableOrderFields(payload),
                id: existingOrder.id,
                userId: companyOwnerId,
                updatedAt: now,
                updated_by: session.userId,
                created_by: createdBy || existingOrder.created_by || session.userId
            };

            const result = await safeUpsert(client, 'order_confirmations', mutableOrderData);
            if (result.error) {
                console.error('SUPABASE UPSERT ERROR:', result.error);
                throw result.error;
            }

            return NextResponse.json({ success: true, id: orderId });
        }

        if (!isStoredOrderPdfReference(payload, companyOwnerId)) {
            return NextResponse.json({ error: 'Orders require a stored PDF' }, { status: 400 });
        }

        const orderData = {
            ...payload,
            id: orderId,
            userId: companyOwnerId,
            updatedAt: now,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const result = await safeUpsert(client, 'order_confirmations', orderData);
        if (result.error) {
            console.error('SUPABASE UPSERT ERROR:', result.error);
            throw result.error;
        }

        return NextResponse.json({ success: true, id: orderId });
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

    if (!hasPermission(session, 'orders_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        return NextResponse.json({ error: 'Orders cannot be deleted; use cancelled status instead' }, { status: 403 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

