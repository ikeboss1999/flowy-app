import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

function extractStoragePath(value?: string | null) {
    if (!value) return null;
    if (!value.startsWith('http')) return value;

    try {
        const url = new URL(value);
        const publicPrefix = '/storage/v1/object/public/offers/';
        const signedPrefix = '/storage/v1/object/sign/offers/';
        if (url.pathname.startsWith(publicPrefix)) {
            return decodeURIComponent(url.pathname.slice(publicPrefix.length));
        }
        if (url.pathname.startsWith(signedPrefix)) {
            return decodeURIComponent(url.pathname.slice(signedPrefix.length));
        }
    } catch {
        return null;
    }

    return null;
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

    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');

    if (!offerId) {
        return NextResponse.json({ error: 'Missing offer id' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: offer, error } = await client
            .from('offers')
            .select('*')
            .eq('id', offerId)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (error) throw error;
        if (!offer) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }
        if (offer.status === 'draft') {
            return NextResponse.json({ error: 'Draft offers do not have a locked PDF' }, { status: 400 });
        }

        const storagePath = offer.pdfPath || extractStoragePath(offer.pdfUrl);
        if (storagePath) {
            if (!supabaseAdmin) {
                return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
            }
            if (!storagePath.startsWith(`${companyOwnerId}/`)) {
                if (offer.pdfUrl?.startsWith('http')) {
                    return NextResponse.json({ url: offer.pdfUrl, expiresIn: null });
                }
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            const { data, error: signedError } = await supabaseAdmin.storage
                .from('offers')
                .createSignedUrl(storagePath, 3600, { download: false });

            if (signedError || !data?.signedUrl) {
                console.error('[OfferPDFUrl] Signed URL failed:', signedError);
                return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
            }

            return NextResponse.json({ url: data.signedUrl, expiresIn: 3600 });
        }

        if (offer.pdfUrl?.startsWith('http')) {
            return NextResponse.json({ url: offer.pdfUrl, expiresIn: null });
        }

        return NextResponse.json({ error: 'Offer has no stored PDF' }, { status: 404 });
    } catch (e) {
        console.error('[OfferPDFUrl] Failed:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
