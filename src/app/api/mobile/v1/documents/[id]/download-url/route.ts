import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(request, 'documents');
        if (!auth.ok) return auth.response;

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Signed downloads require service role configuration' }, { status: 503 });
        }

        const { data: document, error } = await auth.client
            .from('employee_documents')
            .select('id,name,mimeType,fileSize,storagePath,isShared')
            .eq('id', params.id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', auth.employeeId)
            .eq('isShared', true)
            .maybeSingle();

        if (error) throw error;
        if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

        const { data, error: signedUrlError } = await supabaseAdmin.storage
            .from('employee-mobile-documents')
            .createSignedUrl(document.storagePath, 10 * 60, { download: false });

        if (signedUrlError) throw signedUrlError;

        return NextResponse.json({
            document: {
                id: document.id,
                name: document.name,
                mimeType: document.mimeType,
                fileSize: document.fileSize,
            },
            url: data.signedUrl,
            expiresIn: 10 * 60,
        });
    } catch (error) {
        console.error('[MobileDocumentDownloadUrl] failed:', error);
        return NextResponse.json({ error: 'Failed to create mobile document download URL' }, { status: 500 });
    }
}
