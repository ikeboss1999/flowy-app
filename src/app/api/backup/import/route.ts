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
                            INSERT OR REPLACE INTO customers 
                            (id, name, email, phone, address, type, status, salutation, taxId, commercialRegisterNumber, reverseChargeEnabled, defaultPaymentTermId, notes, lastActivity, createdAt, updatedAt, userId)
                            VALUES (@id, @name, @email, @phone, @address, @type, @status, @salutation, @taxId, @commercialRegisterNumber, @reverseChargeEnabled, @defaultPaymentTermId, @notes, @lastActivity, @createdAt, @updatedAt, @userId)
                        `);
                        for (const row of backupData.customers) {
                            insert.run({
                                id: row.id,
                                name: row.name,
                                email: row.email || null,
                                phone: row.phone || null,
                                address: typeof row.address === 'string' ? row.address : JSON.stringify(row.address),
                                type: row.type || 'private',
                                status: row.status || 'active',
                                salutation: row.salutation || null,
                                taxId: row.taxId || null,
                                commercialRegisterNumber: row.commercialRegisterNumber || null,
                                reverseChargeEnabled: row.reverseChargeEnabled ? 1 : 0,
                                defaultPaymentTermId: row.defaultPaymentTermId || null,
                                notes: row.notes || null,
                                lastActivity: row.lastActivity || null,
                                createdAt: row.createdAt || new Date().toISOString(),
                                updatedAt: row.updatedAt || new Date().toISOString(),
                                userId: currentUserId || row.userId
                            });
                        }
                    } else if (table === 'invoices') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO invoices (id, invoiceNumber, customerId, projectId, constructionProject, paymentPlanItemId, billingType, issueDate, items, subtotal, taxRate, taxAmount, totalAmount, isReverseCharge, status, paymentTerms, perfFrom, perfTo, processor, subjectExtra, partialPaymentNumber, previousInvoices, dunningLevel, lastDunningDate, dunningHistory, paidAmount, paymentDeviation, notes, createdAt, updatedAt, userId)
                            VALUES (@id, @invoiceNumber, @customerId, @projectId, @constructionProject, @paymentPlanItemId, @billingType, @issueDate, @items, @subtotal, @taxRate, @taxAmount, @totalAmount, @isReverseCharge, @status, @paymentTerms, @perfFrom, @perfTo, @processor, @subjectExtra, @partialPaymentNumber, @previousInvoices, @dunningLevel, @lastDunningDate, @dunningHistory, @paidAmount, @paymentDeviation, @notes, @createdAt, @updatedAt, @userId)
                        `);
                        for (const row of backupData.invoices) {
                            insert.run({
                                id: row.id,
                                invoiceNumber: row.invoiceNumber,
                                customerId: row.customerId,
                                projectId: row.projectId || null,
                                constructionProject: row.constructionProject || null,
                                paymentPlanItemId: row.paymentPlanItemId || null,
                                billingType: row.billingType || 'standard',
                                issueDate: row.issueDate,
                                items: typeof row.items === 'string' ? row.items : JSON.stringify(row.items || []),
                                subtotal: row.subtotal || 0,
                                taxRate: row.taxRate || 0,
                                taxAmount: row.taxAmount || 0,
                                totalAmount: row.totalAmount || 0,
                                isReverseCharge: row.isReverseCharge ? 1 : 0,
                                status: row.status || 'draft',
                                paymentTerms: row.paymentTerms || null,
                                perfFrom: row.performancePeriod?.from || row.perfFrom || null,
                                perfTo: row.performancePeriod?.to || row.perfTo || null,
                                processor: row.processor || null,
                                subjectExtra: row.subjectExtra || null,
                                partialPaymentNumber: row.partialPaymentNumber || null,
                                previousInvoices: typeof row.previousInvoices === 'string' ? row.previousInvoices : JSON.stringify(row.previousInvoices || []),
                                dunningLevel: row.dunningLevel || 0,
                                lastDunningDate: row.lastDunningDate || null,
                                dunningHistory: typeof row.dunningHistory === 'string' ? row.dunningHistory : JSON.stringify(row.dunningHistory || []),
                                paidAmount: row.paidAmount || 0,
                                paymentDeviation: typeof row.paymentDeviation === 'string' ? row.paymentDeviation : JSON.stringify(row.paymentDeviation || null),
                                notes: row.notes || null,
                                createdAt: row.createdAt || new Date().toISOString(),
                                updatedAt: row.updatedAt || new Date().toISOString(),
                                userId: currentUserId || row.userId
                            });
                        }
                    } else if (table === 'settings') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO settings (userId, companyData, accountSettings, invoiceSettings)
                            VALUES (@userId, @companyData, @accountSettings, @invoiceSettings)
                        `);
                        for (const row of backupData.settings) {
                            insert.run({
                                userId: currentUserId || row.userId,
                                companyData: typeof row.companyData === 'string' ? row.companyData : JSON.stringify(row.companyData || null),
                                accountSettings: typeof row.accountSettings === 'string' ? row.accountSettings : JSON.stringify(row.accountSettings || null),
                                invoiceSettings: typeof row.invoiceSettings === 'string' ? row.invoiceSettings : JSON.stringify(row.invoiceSettings || null)
                            });
                        }
                    } else if (table === 'vehicles') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO vehicles (id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt, userId)
                            VALUES (@id, @basicInfo, @fleetDetails, @maintenance, @leasing, @documents, @createdAt, @userId)
                        `);
                        for (const row of backupData.vehicles) {
                            insert.run({
                                id: row.id,
                                basicInfo: typeof row.basicInfo === 'string' ? row.basicInfo : JSON.stringify(row.basicInfo || {}),
                                fleetDetails: typeof row.fleetDetails === 'string' ? row.fleetDetails : JSON.stringify(row.fleetDetails || {}),
                                maintenance: typeof row.maintenance === 'string' ? row.maintenance : JSON.stringify(row.maintenance || {}),
                                leasing: typeof row.leasing === 'string' ? row.leasing : JSON.stringify(row.leasing || null),
                                documents: typeof row.documents === 'string' ? row.documents : JSON.stringify(row.documents || []),
                                createdAt: row.createdAt || new Date().toISOString(),
                                userId: currentUserId || row.userId
                            });
                        }
                    } else if (table === 'employees') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO employees (id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, createdAt, userId)
                            VALUES (@id, @employeeNumber, @personalData, @bankDetails, @employment, @additionalInfo, @weeklySchedule, @documents, @avatar, @createdAt, @userId)
                        `);
                        for (const row of backupData.employees) {
                            insert.run({
                                id: row.id,
                                employeeNumber: row.employeeNumber || '000',
                                personalData: typeof row.personalData === 'string' ? row.personalData : JSON.stringify(row.personalData || {}),
                                bankDetails: typeof row.bankDetails === 'string' ? row.bankDetails : JSON.stringify(row.bankDetails || {}),
                                employment: typeof row.employment === 'string' ? row.employment : JSON.stringify(row.employment || {}),
                                additionalInfo: typeof row.additionalInfo === 'string' ? row.additionalInfo : JSON.stringify(row.additionalInfo || null),
                                weeklySchedule: typeof row.weeklySchedule === 'string' ? row.weeklySchedule : JSON.stringify(row.weeklySchedule || null),
                                documents: typeof row.documents === 'string' ? row.documents : JSON.stringify(row.documents || []),
                                avatar: row.avatar || null,
                                createdAt: row.createdAt || new Date().toISOString(),
                                userId: currentUserId || row.userId
                            });
                        }
                    } else if (table === 'time_entries') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO time_entries (id, employeeId, date, startTime, endTime, duration, overtime, location, type, projectId, serviceId, description, userId, createdAt)
                            VALUES (@id, @employeeId, @date, @startTime, @endTime, @duration, @overtime, @location, @type, @projectId, @serviceId, @description, @userId, @createdAt)
                        `);
                        for (const row of backupData.time_entries) {
                            insert.run({
                                id: row.id,
                                employeeId: row.employeeId,
                                date: row.date,
                                startTime: row.startTime || null,
                                endTime: row.endTime || null,
                                duration: row.duration || 0,
                                overtime: row.overtime || 0,
                                location: row.location || null,
                                type: row.type || 'working',
                                projectId: row.projectId || null,
                                serviceId: row.serviceId || null,
                                description: row.description || null,
                                userId: currentUserId || row.userId,
                                createdAt: row.createdAt || new Date().toISOString()
                            });
                        }
                    } else if (table === 'timesheets') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO timesheets (id, employeeId, month, status, finalizedAt, userId)
                            VALUES (@id, @employeeId, @month, @status, @finalizedAt, @userId)
                        `);
                        for (const row of backupData.timesheets) {
                            insert.run({
                                id: row.id,
                                employeeId: row.employeeId,
                                month: row.month,
                                status: row.status || 'draft',
                                finalizedAt: row.finalizedAt || null,
                                userId: currentUserId || row.userId
                            });
                        }
                    } else if (table === 'todos') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO todos (id, task, completed, priority, createdAt, userId)
                            VALUES (@id, @task, @completed, @priority, @createdAt, @userId)
                        `);
                        for (const row of backupData.todos) {
                            insert.run({
                                id: row.id,
                                task: row.task,
                                completed: row.completed ? 1 : 0,
                                priority: row.priority || 'medium',
                                createdAt: row.createdAt || new Date().toISOString(),
                                userId: currentUserId || row.userId
                            });
                        }
                    } else if (table === 'calendar_events') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO calendar_events (id, title, description, startDate, endDate, isAllDay, type, color, location, attendees, projectId, startTime, endTime, createdAt, userId)
                            VALUES (@id, @title, @description, @startDate, @endDate, @isAllDay, @type, @color, @location, @attendees, @projectId, @startTime, @endTime, @createdAt, @userId)
                        `);
                        for (const row of backupData.calendar_events) {
                            insert.run({
                                id: row.id,
                                title: row.title,
                                description: row.description || null,
                                startDate: row.startDate,
                                endDate: row.endDate,
                                isAllDay: row.isAllDay ? 1 : 0,
                                type: row.type || 'other',
                                color: row.color || '#6366f1',
                                location: row.location || null,
                                attendees: typeof row.attendees === 'string' ? row.attendees : JSON.stringify(row.attendees || []),
                                projectId: row.projectId || null,
                                startTime: row.startTime || null,
                                endTime: row.endTime || null,
                                createdAt: row.createdAt || new Date().toISOString(),
                                userId: currentUserId || row.userId
                            });
                        }
                    } else if (table === 'services') {
                        const insert = db.prepare(`
                            INSERT OR REPLACE INTO services (id, name, title, description, category, price, unit, userId, createdAt, updatedAt)
                            VALUES (@id, @name, @title, @description, @category, @price, @unit, @userId, @createdAt, @updatedAt)
                        `);
                        for (const row of backupData.services) {
                            insert.run({
                                id: row.id,
                                name: row.title || row.name, // Support both formats
                                title: row.title || row.name,
                                description: row.description || null,
                                category: row.category || 'Other',
                                price: row.price || 0,
                                unit: row.unit || 'PA',
                                userId: currentUserId || row.userId,
                                createdAt: row.createdAt || new Date().toISOString(),
                                updatedAt: row.updatedAt || new Date().toISOString()
                            });
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
