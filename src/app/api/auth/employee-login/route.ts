import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isWeb } from '@/lib/database';
import { Employee } from '@/types/employee';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const staffId = body.staffId?.toString().trim();
        const pin = body.pin?.toString().trim();

        if (!staffId || !pin) {
            return NextResponse.json({ message: 'Verfügernummer und PIN sind erforderlich' }, { status: 400 });
        }

        let employee: Employee | null = null;

        if (isWeb) {
            // In web mode, we search Supabase. 
            // Note: We need a way to filter by the current company if multiple companies exist,
            // but for now we search globally across employees.
            // SECURITY: Use supabaseAdmin to bypass RLS policies and find the employee
            const client = supabaseAdmin || supabase;
            if (!supabaseAdmin) {
                console.warn('[EmployeeLogin] WARNING: supabaseAdmin is null. Falling back to anonymous client. Search may fail due to RLS.');
            }

            const { data, error } = await client
                .from('employees')
                .select('*')
                .filter('appAccess->>staffId', 'eq', staffId)
                .single();

            if (error || !data) {
                return NextResponse.json({ message: 'Mitarbeiter nicht gefunden' }, { status: 404 });
            }

            employee = data as Employee;
        } else {
            // In local mode, we search SQLite first.
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
                    break;
                }
            }

            // FALLBACK: If not found in local SQLite, try Supabase (production safety)
            if (!employee) {
                console.log(`[EmployeeLogin] Not found locally, falling back to Supabase for ${staffId}...`);
                const client = supabaseAdmin || supabase;
                const { data, error } = await client
                    .from('employees')
                    .select('*')
                    .filter('appAccess->>staffId', 'eq', staffId)
                    .single();

                if (data && !error) {
                    console.log(`[EmployeeLogin] Found employee ${staffId} in Supabase. Provisioning local DB...`);
                    employee = data as Employee;

                    // Cache in local SQLite for future offline access
                    try {
                        const stmt = sqliteDb.prepare(`
                            INSERT OR REPLACE INTO employees 
                            (id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, appAccess, pendingChanges, sharedFolders, createdAt, updatedAt, userId)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);

                        stmt.run(
                            employee.id,
                            employee.employeeNumber,
                            JSON.stringify(employee.personalData),
                            JSON.stringify(employee.bankDetails),
                            JSON.stringify(employee.employment),
                            JSON.stringify(employee.additionalInfo || null),
                            JSON.stringify(employee.weeklySchedule || null),
                            JSON.stringify(employee.documents || []),
                            employee.avatar || null,
                            JSON.stringify(employee.appAccess),
                            JSON.stringify(employee.pendingChanges || null),
                            JSON.stringify(employee.sharedFolders || []),
                            employee.createdAt || new Date().toISOString(),
                            employee.updatedAt || new Date().toISOString(),
                            employee.userId
                        );
                        console.log(`[EmployeeLogin] Local provisioning successful for ${staffId}`);
                    } catch (dbError) {
                        console.error('[EmployeeLogin] Local provisioning failed:', dbError);
                    }
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

        // Create a legacy session token for the employee
        // This allows them to pass through the middleware and API BOLA checks
        // We use the BOSS's userId so they see the boss's data
        const { createSessionToken } = await import('@/lib/auth');
        const sessionToken = await createSessionToken({
            userId: employee.userId!,
            email: employee.personalData.email || 'employee@flowy.local',
            role: 'employee'
        });

        const response = NextResponse.json({
            success: true,
            employee: responseEmployee
        });

        // Set the session cookie
        response.cookies.set('session_token', sessionToken, {
            httpOnly: true,
            secure: false, // Must be false for http://localhost in Electron
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Employee Login Error:', error);
        return NextResponse.json({ message: 'Interner Serverfehler' }, { status: 500 });
    }
}
