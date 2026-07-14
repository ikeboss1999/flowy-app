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
        const publicPrefix = '/storage/v1/object/public/invoices/';
        const signedPrefix = '/storage/v1/object/sign/invoices/';
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

    if (!hasPermission(session, 'dunning_read')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const level = Number(searchParams.get('level'));
    const date = searchParams.get('date');
    const download = searchParams.get('download') === '1';

    if (!invoiceId || !level || !date) {
        return NextResponse.json({ error: 'Missing invoiceId, level, or date' }, { status: 400 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: invoice, error } = await client
            .from('invoices')
            .select('id, invoiceNumber, userId, dunningHistory')
            .eq('id', invoiceId)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (error) throw error;
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const history = Array.isArray(invoice.dunningHistory) ? invoice.dunningHistory : [];
        const entry = history.find((item: any) => Number(item.level) === level && item.date === date);
        const storagePath = extractStoragePath(entry?.pdfPath || entry?.pdfUrl);

        if (!storagePath) {
            return NextResponse.json({ error: 'Dunning PDF not found' }, { status: 404 });
        }

        if (!storagePath.startsWith(`${companyOwnerId}/`)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
        }

        const safeInvoiceNumber = String(invoice.invoiceNumber || invoiceId).replace(/[^a-zA-Z0-9._-]/g, '_');
        const { data, error: signedError } = await supabaseAdmin.storage
            .from('invoices')
            .createSignedUrl(storagePath, 3600, {
                download: download ? `Mahnung_${level}_${safeInvoiceNumber}.pdf` : false,
            });

        if (signedError || !data?.signedUrl) {
            console.error('[DunningPDFUrl] Signed URL failed:', signedError);
            return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
        }

        return NextResponse.json({ url: data.signedUrl, expiresIn: 3600 });
    } catch (e) {
        console.error('[DunningPDFUrl] Failed:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
