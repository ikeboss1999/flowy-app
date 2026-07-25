import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { decryptEmployee, encryptEmployee } from '@/lib/encryption';
import { safeUpsert } from '@/lib/supabase-helper';
import type { EmployeeDocument } from '@/types/employee';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const { id } = params;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'employees_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const document: EmployeeDocument = body.document;

        if (!document || !document.name) {
            return NextResponse.json({ error: 'Document is required' }, { status: 400 });
        }

        const client = supabaseAdmin || supabase;
        const { data: existingRow, error: fetchError } = await client
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (fetchError || !existingRow) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const decryptedEmp = decryptEmployee(existingRow as any);
        const existingDocs = decryptedEmp.documents || [];

        const updatedDocs = existingDocs.some((d) => d.id === document.id)
            ? existingDocs.map((d) => (d.id === document.id ? document : d))
            : [...existingDocs, document];

        const updatedEmp = {
            ...decryptedEmp,
            documents: updatedDocs,
            updatedAt: new Date().toISOString(),
        };

        const encryptedEmp = encryptEmployee(updatedEmp);
        const { error: updateError } = await safeUpsert(client, 'employees', encryptedEmp);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, documents: updatedDocs });
    } catch (error) {
        console.error('Error adding employee document:', error);
        return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;
    const { id } = params;

    if (!companyOwnerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'employees_write')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const docId = searchParams.get('docId');

        if (!docId) {
            return NextResponse.json({ error: 'docId required' }, { status: 400 });
        }

        const client = supabaseAdmin || supabase;
        const { data: existingRow, error: fetchError } = await client
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('userId', companyOwnerId)
            .maybeSingle();

        if (fetchError || !existingRow) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const decryptedEmp = decryptEmployee(existingRow as any);
        const existingDocs = decryptedEmp.documents || [];
        const updatedDocs = existingDocs.filter((d) => d.id !== docId);

        const updatedEmp = {
            ...decryptedEmp,
            documents: updatedDocs,
            updatedAt: new Date().toISOString(),
        };

        const encryptedEmp = encryptEmployee(updatedEmp);
        const { error: updateError } = await safeUpsert(client, 'employees', encryptedEmp);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, documents: updatedDocs });
    } catch (error) {
        console.error('Error deleting employee document:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
