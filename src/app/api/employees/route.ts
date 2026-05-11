import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    try {
        const client = supabaseAdmin || supabase;
        const { data: employees, error } = await client
            .from('employees')
            .select('*')
            .eq('userId', userId);
        if (error) throw error;
        return NextResponse.json(employees);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    try {
        const payload = await request.json();
        const employee = payload.employee || payload;
        const { id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, pendingChanges, sharedFolders, createdAt } = employee;
        let { appAccess } = employee;

        // Hash PIN if it's a new plain-text value (not already a bcrypt hash)
        if (appAccess?.accessPIN) {
            const isAlreadyHashed = appAccess.accessPIN.startsWith('$2b$') || appAccess.accessPIN.startsWith('$2a$');
            if (!isAlreadyHashed) {
                appAccess = { ...appAccess, accessPIN: await bcrypt.hash(appAccess.accessPIN, 10) };
            }
        }

        const empId = id || nanoid();

        const client = supabaseAdmin || supabase;
        const { error } = await client
            .from('employees')
            .upsert({
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
                userId
            });
        if (error) throw error;

        return NextResponse.json({ success: true, id: empId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('employees').delete().eq('id', id).eq('userId', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
