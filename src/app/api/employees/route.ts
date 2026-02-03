import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ message: 'Missing userId' }, { status: 400 });

    try {
        const rows = db.prepare('SELECT * FROM employees WHERE userId = ?').all(userId);
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
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, employee } = await request.json();
        const { id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, createdAt } = employee;

        const empId = id || nanoid();

        const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(empId);

        if (existing) {
            db.prepare(`
                UPDATE employees SET 
                employeeNumber = ?, personalData = ?, bankDetails = ?, employment = ?, 
                additionalInfo = ?, weeklySchedule = ?, documents = ?, avatar = ?
                WHERE id = ?
            `).run(
                employeeNumber, JSON.stringify(personalData), JSON.stringify(bankDetails), JSON.stringify(employment),
                JSON.stringify(additionalInfo), JSON.stringify(weeklySchedule), JSON.stringify(documents), avatar, empId
            );
        } else {
            db.prepare(`
                INSERT INTO employees (id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, createdAt, userId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                empId, employeeNumber, JSON.stringify(personalData), JSON.stringify(bankDetails), JSON.stringify(employment),
                JSON.stringify(additionalInfo), JSON.stringify(weeklySchedule), JSON.stringify(documents), avatar, createdAt || new Date().toISOString(), userId
            );
        }
        return NextResponse.json({ success: true, id: empId });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
