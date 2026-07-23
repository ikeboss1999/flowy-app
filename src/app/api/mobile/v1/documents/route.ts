import { NextResponse } from 'next/server';
import { requireMobileSession } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const auth = await requireMobileSession(request, 'documents');
        if (!auth.ok) return auth.response;

        const [{ data: folders, error: foldersError }, { data: documents, error: documentsError }, { data: receipts, error: receiptsError }] = await Promise.all([
            auth.client
                .from('employee_document_folders')
                .select('id,name,sortOrder,createdAt,updatedAt')
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', auth.employeeId)
                .order('sortOrder', { ascending: true })
                .order('name', { ascending: true }),
            auth.client
                .from('employee_documents')
                .select('id,folderId,name,mimeType,fileSize,isShared,readRequired,createdAt,updatedAt')
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', auth.employeeId)
                .eq('isShared', true)
                .order('createdAt', { ascending: false }),
            auth.client
                .from('document_receipts')
                .select('documentId,readAt')
                .eq('userId', auth.companyOwnerId)
                .eq('employeeId', auth.employeeId),
        ]);

        if (foldersError) throw foldersError;
        if (documentsError) throw documentsError;
        if (receiptsError) throw receiptsError;

        const receiptByDocumentId = new Map((receipts || []).map((receipt: any) => [receipt.documentId, receipt.readAt]));
        const responseDocuments = (documents || []).map((document: any) => ({
            ...document,
            readAt: receiptByDocumentId.get(document.id) || null,
        }));

        return NextResponse.json({
            folders: folders || [],
            documents: responseDocuments,
        });
    } catch (error) {
        console.error('[MobileDocuments] failed:', error);
        return NextResponse.json({ error: 'Failed to fetch mobile documents' }, { status: 500 });
    }
}
