import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        console.log('--- BACKUP IMPORT START (User-Portable) ---');
        const data = await request.json();

        if (!data || !data.version) {
            console.error('Import failed: Missing version or data');
            return NextResponse.json({ message: 'Ungültige Datei: Version fehlt.' }, { status: 400 });
        }

        const currentUserId = data.currentUserId;
        if (!currentUserId) {
            console.warn('Import Warning: No currentUserId provided. Data will keep original ownership.');
        } else {
            console.log(`Re-assigning all data to user: ${currentUserId}`);
        }

        console.log(`Importing version ${data.version}, export date: ${data.exportDate}`);

        // Use a transaction for safety
        const transaction = db.transaction((backupData: any) => {
            const tables = [
                'projects', 'customers', 'invoices', 'settings', 'vehicles',
                'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
            ];

            let totalRestored = 0;

            for (const table of tables) {
                try {
                    db.prepare(`DELETE FROM ${table}`).run();
                    console.log(`Table ${table} cleared.`);
                } catch (e) {
                    console.warn(`Warning: Could not clear table ${table}:`, e);
                }

                if (backupData[table] && Array.isArray(backupData[table])) {
                    const rowCount = backupData[table].length;
                    if (rowCount === 0) continue;

                    console.log(`Restoring ${rowCount} rows for ${table}...`);

                    // Specific handling for each table with currentUserId injection
                    if (table === 'projects') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO projects (id, name, customerId, description, status, address, startDate, endDate, budget, paymentPlan, createdAt, updatedAt, userId)
                            VALUES (@id, @name, @customerId, @description, @status, @address, @startDate, @endDate, @budget, @paymentPlan, @createdAt, @updatedAt, @userId)
                        `);
                        for (const row of backupData.projects) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'customers') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO customers (id, name, email, phone, address, createdAt, updatedAt, userId)
                            VALUES (@id, @name, @email, @phone, @address, @createdAt, @updatedAt, @userId)
                        `);
                        for (const row of backupData.customers) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'invoices') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO invoices (id, invoiceNumber, customerId, projectId, billingType, issueDate, items, subtotal, taxRate, taxAmount, totalAmount, status, paymentTerms, perfFrom, perfTo, processor, subjectExtra, partialPaymentNumber, previousInvoices, dunningLevel, lastDunningDate, dunningHistory, paidAmount, paymentDeviation, notes, createdAt, updatedAt, userId)
                            VALUES (@id, @invoiceNumber, @customerId, @projectId, @billingType, @issueDate, @items, @subtotal, @taxRate, @taxAmount, @totalAmount, @status, @paymentTerms, @perfFrom, @perfTo, @processor, @subjectExtra, @partialPaymentNumber, @previousInvoices, @dunningLevel, @lastDunningDate, @dunningHistory, @paidAmount, @paymentDeviation, @notes, @createdAt, @updatedAt, @userId)
                        `);
                        for (const row of backupData.invoices) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'settings') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO settings (userId, companyData, accountSettings, invoiceSettings)
                            VALUES (@userId, @companyData, @accountSettings, @invoiceSettings)
                        `);
                        for (const row of backupData.settings) {
                            // Note: Settings uses userId as PRIMARY KEY. We must map the record exactly once for the current user.
                            // If backup has multiple users' settings, only the LAST one will prevail for the current user.
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'vehicles') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO vehicles (id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt, userId)
                            VALUES (@id, @basicInfo, @fleetDetails, @maintenance, @leasing, @documents, @createdAt, @userId)
                        `);
                        for (const row of backupData.vehicles) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'employees') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO employees (id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, createdAt, userId)
                            VALUES (@id, @employeeNumber, @personalData, @bankDetails, @employment, @additionalInfo, @weeklySchedule, @documents, @avatar, @createdAt, @userId)
                        `);
                        for (const row of backupData.employees) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'time_entries') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO time_entries (id, employeeId, date, startTime, endTime, duration, type, projectId, serviceId, description, userId, createdAt)
                            VALUES (@id, @employeeId, @date, @startTime, @endTime, @duration, @type, @projectId, @serviceId, @description, @userId, @createdAt)
                        `);
                        for (const row of backupData.time_entries) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'timesheets') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO timesheets (id, employeeId, month, status, finalizedAt, userId)
                            VALUES (@id, @employeeId, @month, @status, @finalizedAt, @userId)
                        `);
                        for (const row of backupData.timesheets) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'todos') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO todos (id, task, completed, priority, createdAt, userId)
                            VALUES (@id, @task, @completed, @priority, @createdAt, @userId)
                        `);
                        for (const row of backupData.todos) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'calendar_events') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO calendar_events (id, title, description, startDate, endDate, isAllDay, type, color, location, attendees, projectId, createdAt, userId)
                            VALUES (@id, @title, @description, @startDate, @endDate, @isAllDay, @type, @color, @location, @attendees, @projectId, @createdAt, @userId)
                        `);
                        for (const row of backupData.calendar_events) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    } else if (table === 'services') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO services (id, name, description, category, price, unit, userId)
                            VALUES (@id, @name, @description, @category, @price, @unit, @userId)
                        `);
                        for (const row of backupData.services) {
                            insert.run({ ...row, userId: currentUserId || row.userId });
                        }
                    }

                    totalRestored += rowCount;
                    console.log(`Status: ${table} done.`);
                }
            }
            return totalRestored;
        });

        const count = transaction(data);
        console.log(`--- IMPORT SUCCESSFUL (Portable): ${count} rows total ---`);

        return NextResponse.json({
            message: 'Backup erfolgreich wiederhergestellt und dem aktuellen Nutzer zugewiesen.',
            rowCount: count
        });
    } catch (error: any) {
        console.error('CRITICAL: Portable Backup restore failed:', error);
        return NextResponse.json({
            message: 'Daten-Wiederherstellung fehlgeschlagen.',
            error: error.message
        }, { status: 500 });
    }
}
