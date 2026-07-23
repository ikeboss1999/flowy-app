import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requireMobileSession(request, 'documents');
        if (!auth.ok) return auth.response;

        const { data: document, error: documentError } = await auth.client
            .from('employee_documents')
            .select('id')
            .eq('id', params.id)
            .eq('userId', auth.companyOwnerId)
            .eq('employeeId', auth.employeeId)
            .eq('isShared', true)
            .maybeSingle();

        if (documentError) throw documentError;
        if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

        const now = new Date().toISOString();
        const { data, error } = await auth.client
            .from('document_receipts')
            .upsert(
                {
                    userId: auth.companyOwnerId,
                    documentId: params.id,
                    employeeId: auth.employeeId,
                    readAt: now,
                },
                { onConflict: 'documentId,employeeId' }
            )
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, receipt: data });
    } catch (error) {
        console.error('[MobileDocumentRead] failed:', error);
        return NextResponse.json({ error: 'Failed to mark mobile document as read' }, { status: 500 });
    }
}
