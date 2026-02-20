import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';
import { getUserSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getUserSession();
    const userId = session?.userId;

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    try {
        if (isWeb) {
            const client = supabaseAdmin || supabase;
            const { data: employees, error } = await client
                .from('employees')
                .select('*')
                .eq('userId', userId);
            if (error) throw error;
            return NextResponse.json(employees);
        } else {
            const rows = sqliteDb.prepare('SELECT * FROM employees WHERE userId = ?').all(userId);
            const data = rows.map((r: any) => ({
                ...r,
                personalData: JSON.parse(r.personalData),
                bankDetails: JSON.parse(r.bankDetails),
                employment: JSON.parse(r.employment),
                additionalInfo: r.additionalInfo ? JSON.parse(r.additionalInfo) : null,
                weeklySchedule: r.weeklySchedule ? JSON.parse(r.weeklySchedule) : null,
                documents: r.documents ? JSON.parse(r.documents) : [],
                appAccess: r.appAccess ? JSON.parse(r.appAccess) : null,
                pendingChanges: r.pendingChanges ? JSON.parse(r.pendingChanges) : null,
                sharedFolders: r.sharedFolders ? JSON.parse(r.sharedFolders) : []
            }));
            return NextResponse.json(data);
        }
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
        // Support both { employee: { ... } } and { ... }
        const employee = payload.employee || payload;
        const { id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, appAccess, pendingChanges, sharedFolders, createdAt } = employee;

        const empId = id || nanoid();

        if (isWeb) {
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
                    userId // Force userId from session
                });
            if (error) throw error;
        } else {
            const now = new Date().toISOString();
            const updatedAt = employee.updatedAt || now;

            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO employees 
                (id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, appAccess, pendingChanges, sharedFolders, createdAt, updatedAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                empId, employeeNumber, JSON.stringify(personalData), JSON.stringify(bankDetails), JSON.stringify(employment),
                JSON.stringify(additionalInfo), JSON.stringify(weeklySchedule), JSON.stringify(documents), avatar,
                JSON.stringify(appAccess), JSON.stringify(pendingChanges), JSON.stringify(sharedFolders),
                createdAt || now, updatedAt, userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('employees', { ...employee, id: empId, updatedAt }, userId);
        }

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
        if (isWeb) {
            // Ensure user owns the record they are deleting
            const client = supabaseAdmin || supabase;
            const { error } = await client.from('employees').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            // Check ownership for local delete (extra safety)
            const existing = sqliteDb.prepare('SELECT userId FROM employees WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM employees WHERE id = ? AND userId = ?').run(id, userId);

            // Silent Sync
            const client = supabaseAdmin || supabase;
            client.from('employees').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) console.error('[BackgroundSync] Employee delete failed', error);
            });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
