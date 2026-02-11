import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { UnifiedDB, isWeb } from '@/lib/database';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        if (isWeb) {
            const { data: employees, error } = await supabase
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
                documents: r.documents ? JSON.parse(r.documents) : []
            }));
            return NextResponse.json(data);
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, employee } = await request.json();
        const { id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, createdAt } = employee;

        const empId = id || nanoid();

        if (isWeb) {
            const { error } = await supabase
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
                    createdAt: createdAt || new Date().toISOString(),
                    userId
                });
            if (error) throw error;
        } else {
            const stmt = sqliteDb.prepare(`
                INSERT OR REPLACE INTO employees 
                (id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, createdAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                empId, employeeNumber, JSON.stringify(personalData), JSON.stringify(bankDetails), JSON.stringify(employment),
                JSON.stringify(additionalInfo), JSON.stringify(weeklySchedule), JSON.stringify(documents), avatar, createdAt || new Date().toISOString(), userId
            );

            // Silent Sync
            UnifiedDB.syncToCloud('employees', { ...employee, id: empId }, userId);
        }

        return NextResponse.json({ success: true, id: empId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        if (isWeb) {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare('DELETE FROM employees WHERE id = ?').run(id);

            if (userId) {
                supabase.from('employees').delete().eq('id', id).then(({ error }) => {
                    if (error) console.error('[BackgroundSync] Employee delete failed', error);
                });
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
