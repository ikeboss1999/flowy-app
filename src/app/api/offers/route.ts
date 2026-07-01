import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';

export const dynamic = 'force-dynamic';

const offerMutableAfterFinalization = ['status'];

function pickMutableOfferFields(offer: any) {
    return offerMutableAfterFinalization.reduce((fields, key) => {
        if (Object.prototype.hasOwnProperty.call(offer, key)) {
            fields[key] = offer[key];
        }
        return fields;
    }, {} as Record<string, any>);
}

function isStoredOfferPdfReference(offer: any, companyOwnerId: string) {
    const reference = offer.pdfPath || offer.pdfUrl;
    if (!reference || typeof reference !== 'string') return false;
    if (!reference.startsWith('http')) return reference.startsWith(`${companyOwnerId}/`);

    try {
        const url = new URL(reference);
        return url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL
            && url.pathname.includes('/storage/v1/object/public/offers/');
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

    if (!hasPermission(session, 'offers_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: offers, error } = await client
            .from('offers')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('issueDate', { ascending: false })
            .limit(500);
        if (error) throw error;
        return NextResponse.json(offers);
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

    if (!hasPermission(session, 'offers_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const payload = await request.json();
        const offer = payload.offer || payload;
        const offerId = offer.id || nanoid();
        const now = new Date().toISOString();

        const client = supabaseAdmin || supabase;

        const { data: existingOffer, error: existingError } = offer.id
            ? await client
                .from('offers')
                .select('*')
                .eq('id', offer.id)
                .eq('userId', companyOwnerId)
                .maybeSingle()
            : { data: null, error: null };

        if (existingError) throw existingError;

        // Check if record exists for created_by
        const createdBy = existingOffer?.created_by || (offer.id ? await safeGetCreatedBy(client, 'offers', offer.id) : null);

        if (existingOffer && existingOffer.status !== 'draft') {
            if (offer.status === 'draft') {
                if (session.role !== 'admin' && session.role !== 'developer') {
                    return NextResponse.json({ error: 'Only admins can reopen finalized offers' }, { status: 403 });
                }

                const reopenData = {
                    ...existingOffer,
                    status: 'draft',
                    updatedAt: now,
                    updated_by: session.userId,
                    created_by: createdBy || existingOffer.created_by || session.userId
                };

                const result = await safeUpsert(client, 'offers', reopenData);
                if (result.error) {
                    console.error('SUPABASE UPSERT ERROR:', result.error);
                    throw result.error;
                }

                return NextResponse.json({ success: true, id: offerId });
            }

            const mutableOfferData = {
                ...existingOffer,
                ...pickMutableOfferFields(offer),
                id: existingOffer.id,
                userId: companyOwnerId,
                updatedAt: now,
                updated_by: session.userId,
                created_by: createdBy || existingOffer.created_by || session.userId
            };

            const result = await safeUpsert(client, 'offers', mutableOfferData);
            if (result.error) {
                console.error('SUPABASE UPSERT ERROR:', result.error);
                throw result.error;
            }

            return NextResponse.json({ success: true, id: offerId });
        }

        if (offer.status !== 'draft' && !isStoredOfferPdfReference(offer, companyOwnerId)) {
            return NextResponse.json({ error: 'Finalized offers require a stored PDF' }, { status: 400 });
        }

        const offerData = {
            ...offer,
            id: offerId,
            userId: companyOwnerId,
            updatedAt: now,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const result = await safeUpsert(client, 'offers', offerData);
        if (result.error) {
            console.error('SUPABASE UPSERT ERROR:', result.error);
            throw result.error;
        }

        return NextResponse.json({ success: true, id: offerId });
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

    if (!hasPermission(session, 'offers_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: existingOffer, error: fetchError } = await client
            .from('offers')
            .select('id, status')
            .eq('id', id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existingOffer) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (existingOffer.status !== 'draft') {
            return NextResponse.json({ error: 'Finalized offers cannot be deleted' }, { status: 403 });
        }

        const { error } = await client
            .from('offers')
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

