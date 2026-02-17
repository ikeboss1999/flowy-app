import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { isWeb } from '@/lib/database';
import { Employee } from '@/types/employee';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { staffId, pin } = await request.json();

        if (!staffId || !pin) {
            return NextResponse.json({ message: 'Personalnummer und PIN sind erforderlich' }, { status: 400 });
        }

        let employee: Employee | null = null;

        if (isWeb) {
            // In web mode, we search Supabase. 
            // Note: We need a way to filter by the current company if multiple companies exist,
            // but for now we search globally across employees.
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .filter('appAccess->staffId', 'eq', staffId)
                .single();

            if (error || !data) {
                return NextResponse.json({ message: 'Mitarbeiter nicht gefunden' }, { status: 404 });
            }

            employee = data as Employee;
        } else {
            // In local mode, we search SQLite.
            // We'll iterate through all employees and check their appAccess JSON.
            // A more efficient way would be a generated column or a separate table, 
            // but for a small local DB, this search is fine.
            const rows = sqliteDb.prepare('SELECT * FROM employees').all() as any[];
            for (const row of rows) {
                const appAccess = row.appAccess ? JSON.parse(row.appAccess) : null;
                if (appAccess && appAccess.staffId === staffId) {
                    employee = {
                        ...row,
                        personalData: JSON.parse(row.personalData),
                        bankDetails: JSON.parse(row.bankDetails),
                        employment: JSON.parse(row.employment),
                        additionalInfo: row.additionalInfo ? JSON.parse(row.additionalInfo) : null,
                        weeklySchedule: row.weeklySchedule ? JSON.parse(row.weeklySchedule) : null,
                        documents: row.documents ? JSON.parse(row.documents) : [],
                        appAccess,
                        pendingChanges: row.pendingChanges ? JSON.parse(row.pendingChanges) : null,
                        sharedFolders: row.sharedFolders ? JSON.parse(row.sharedFolders) : []
                    };
                    if (employee) {
                        console.log(`[EmployeeLogin] Found employee ${staffId} with ${employee.documents?.length} documents and ${employee.sharedFolders?.length} folders`);
                    }
                    break;
                }
            }
        }

        if (!employee) {
            return NextResponse.json({ message: 'Mitarbeiter nicht gefunden' }, { status: 404 });
        }

        // Verify PIN and Access Status
        if (!employee.appAccess?.isAccessEnabled) {
            return NextResponse.json({ message: 'App-Zugriff ist für diesen Mitarbeiter deaktiviert' }, { status: 403 });
        }

        if (employee.appAccess.accessPIN !== pin) {
            return NextResponse.json({ message: 'Ungültiger PIN' }, { status: 401 });
        }

        // Success - remove PIN from response for security
        const { appAccess, ...safeEmployee } = employee;
        const responseEmployee = {
            ...safeEmployee,
            appAccess: {
                ...appAccess,
                accessPIN: undefined // Hide PIN in session
            }
        };

        return NextResponse.json({
            success: true,
            employee: responseEmployee
        });

    } catch (error) {
        console.error('Employee Login Error:', error);
        return NextResponse.json({ message: 'Interner Serverfehler' }, { status: 500 });
    }
}
