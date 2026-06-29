import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession, hasPermission } from '@/lib/auth-server';
import { encryptEmployee, decryptEmployee } from '@/lib/encryption';
import { safeGetCreatedBy, safeUpsert } from '@/lib/supabase-helper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session, 'employees_read')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = supabaseAdmin || supabase;
        const { data: employees, error } = await client
            .from('employees')
            .select('*')
            .eq('userId', companyOwnerId)
            .order('createdAt', { ascending: false })
            .limit(200);
        if (error) throw error;
        const decryptedEmployees = (employees || []).map(decryptEmployee);
        return NextResponse.json(decryptedEmployees);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    try {
        const payload = await request.json();
        const employee = payload.employee || payload;

        const isNew = !employee.id;
        const requiredPermission = isNew ? 'employees_create' : 'employees_write';
        if (!hasPermission(session, requiredPermission)) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const encryptedEmployee = encryptEmployee(employee);
        const { id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, pendingChanges, sharedFolders, createdAt } = encryptedEmployee;
        let { appAccess } = encryptedEmployee;

        // Hash PIN if it's a new plain-text value (not already a bcrypt hash)
        if (appAccess?.accessPIN) {
            const isAlreadyHashed = appAccess.accessPIN.startsWith('$2b$') || appAccess.accessPIN.startsWith('$2a$');
            if (!isAlreadyHashed) {
                appAccess = { ...appAccess, accessPIN: await bcrypt.hash(appAccess.accessPIN, 10) };
            }
        }

        const empId = id || nanoid();
        const client = supabaseAdmin || supabase;

        // Check if record exists for created_by
        const createdBy = employee.id ? await safeGetCreatedBy(client, 'employees', employee.id) : null;

        const employeeData = {
            id: empId,
            employeeNumber,
            personalData,
            bankDetails,
            employment,
            additionalInfo,
            weeklySchedule,
            documents,
            avatar,
            appAccess,
            pendingChanges,
            sharedFolders,
            createdAt: createdAt || new Date().toISOString(),
            userId: companyOwnerId,
            updated_by: session.userId,
            created_by: createdBy || session.userId
        };

        const { error } = await safeUpsert(client, 'employees', employeeData);
        if (error) throw error;

        return NextResponse.json({ success: true, id: empId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const companyOwnerId = session?.companyOwnerId;

    if (!companyOwnerId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!hasPermission(session, 'employees_write')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('employees')
            .delete()
            .eq('id', id)
            .eq('userId', companyOwnerId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

