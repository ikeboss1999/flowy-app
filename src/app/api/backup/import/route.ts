import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isWeb, UnifiedDB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        console.log('--- BACKUP IMPORT START (Hybrid) ---');
        const data = await request.json();

        if (!data || !data.version) {
            console.error('Import failed: Missing version or data');
            return NextResponse.json({ message: 'Ungültige Datei: Version fehlt.' }, { status: 400 });
        }

        const currentUserId = data.currentUserId;
        if (!currentUserId) {
            return NextResponse.json({ message: 'User ID ist erforderlich für den Import.' }, { status: 400 });
        }

        console.log(`Importing version ${data.version} for user: ${currentUserId}`);

        const tables = [
            'projects', 'customers', 'invoices', 'settings', 'vehicles',
            'employees', 'time_entries', 'timesheets', 'todos', 'calendar_events', 'services'
        ];

        let totalRestored = 0;

        if (isWeb) {
            console.log('[Import] Web Mode: Restoring to Supabase...');
            const client = supabaseAdmin || supabase;

            // Web Mode: Direct Supabase Upsert
            for (const table of tables) {
                const tableData = data[table];
                if (!tableData || !Array.isArray(tableData) || tableData.length === 0) continue;

                console.log(`[Import] Clearing ${table} for user...`);
                // Clear existing data for this user to avoid staleness (Clean Restore)
                await client.from(table).delete().eq('userId', currentUserId);

                console.log(`[Import] Upserting ${tableData.length} records to ${table}...`);
                const formattedData = UnifiedDB.prepareForCloud(table, tableData, currentUserId);

                const { error } = await client.from(table).upsert(formattedData);
                if (error) {
                    console.error(`[Import] Error importing ${table}:`, error);
                    throw error;
                }
                totalRestored += tableData.length;
            }
        } else {
            console.log('[Import] Local Mode: Restoring to SQLite...');
            // Local Mode: SQLite Transaction (Existing Logic)
            const transaction = sqliteDb.transaction((backupData: any) => {
                let count = 0;
                for (const table of tables) {
                    try {
                        sqliteDb.prepare(`DELETE FROM ${table}`).run();
                    } catch (e) { /* ignore */ }

                    if (backupData[table] && Array.isArray(backupData[table])) {
                        const rows = backupData[table];
                        if (rows.length === 0) continue;

                        // Use specific logic per table to ensure valid mapping
                        if (table === 'projects') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO projects (id, name, customerId, description, status, address, startDate, endDate, budget, paymentPlan, createdAt, updatedAt, userId) VALUES (@id, @name, @customerId, @description, @status, @address, @startDate, @endDate, @budget, @paymentPlan, @createdAt, @updatedAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                address: typeof r.address === 'string' ? r.address : JSON.stringify(r.address),
                                paymentPlan: typeof r.paymentPlan === 'string' ? r.paymentPlan : JSON.stringify(r.paymentPlan),
                                description: r.description || null,
                                status: r.status || 'draft',
                                budget: r.budget || 0,
                                startDate: r.startDate || null,
                                endDate: r.endDate || null,
                                createdAt: r.createdAt || new Date().toISOString(),
                                updatedAt: r.updatedAt || new Date().toISOString()
                            });
                        } else if (table === 'customers') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO customers (id, name, email, phone, address, type, status, salutation, taxId, commercialRegisterNumber, reverseChargeEnabled, defaultPaymentTermId, notes, lastActivity, createdAt, updatedAt, userId) VALUES (@id, @name, @email, @phone, @address, @type, @status, @salutation, @taxId, @commercialRegisterNumber, @reverseChargeEnabled, @defaultPaymentTermId, @notes, @lastActivity, @createdAt, @updatedAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                address: typeof r.address === 'string' ? r.address : JSON.stringify(r.address),
                                reverseChargeEnabled: r.reverseChargeEnabled ? 1 : 0,
                                defaultPaymentTermId: r.defaultPaymentTermId || null,
                                taxId: r.taxId || null,
                                commercialRegisterNumber: r.commercialRegisterNumber || null,
                                notes: r.notes || null,
                                lastActivity: r.lastActivity || null
                            });
                        } else if (table === 'invoices') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO invoices (id, invoiceNumber, customerId, projectId, constructionProject, paymentPlanItemId, billingType, issueDate, items, subtotal, taxRate, taxAmount, totalAmount, isReverseCharge, status, paymentTerms, perfFrom, perfTo, processor, subjectExtra, partialPaymentNumber, previousInvoices, dunningLevel, lastDunningDate, dunningHistory, paidAmount, paymentDeviation, notes, createdAt, updatedAt, userId) VALUES (@id, @invoiceNumber, @customerId, @projectId, @constructionProject, @paymentPlanItemId, @billingType, @issueDate, @items, @subtotal, @taxRate, @taxAmount, @totalAmount, @isReverseCharge, @status, @paymentTerms, @perfFrom, @perfTo, @processor, @subjectExtra, @partialPaymentNumber, @previousInvoices, @dunningLevel, @lastDunningDate, @dunningHistory, @paidAmount, @paymentDeviation, @notes, @createdAt, @updatedAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                items: typeof r.items === 'string' ? r.items : JSON.stringify(r.items),
                                previousInvoices: typeof r.previousInvoices === 'string' ? r.previousInvoices : JSON.stringify(r.previousInvoices),
                                dunningHistory: typeof r.dunningHistory === 'string' ? r.dunningHistory : JSON.stringify(r.dunningHistory),
                                paymentDeviation: typeof r.paymentDeviation === 'string' ? r.paymentDeviation : JSON.stringify(r.paymentDeviation),
                                isReverseCharge: r.isReverseCharge ? 1 : 0,
                                perfFrom: r.performancePeriod?.from || r.perfFrom || null,
                                perfTo: r.performancePeriod?.to || r.perfTo || null,
                                dunningLevel: r.dunningLevel || 0,
                                lastDunningDate: r.lastDunningDate || null,
                                partialPaymentNumber: r.partialPaymentNumber || null,
                                constructionProject: r.constructionProject || null,
                                paymentPlanItemId: r.paymentPlanItemId || null
                            });
                        } else if (table === 'settings') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO settings (userId, companyData, accountSettings, invoiceSettings) VALUES (@userId, @companyData, @accountSettings, @invoiceSettings)`);
                            for (const r of rows) stmt.run({ userId: currentUserId, companyData: JSON.stringify(r.companyData), accountSettings: JSON.stringify(r.accountSettings), invoiceSettings: JSON.stringify(r.invoiceSettings) });
                        } else if (table === 'vehicles') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO vehicles (id, basicInfo, fleetDetails, maintenance, leasing, documents, createdAt, userId) VALUES (@id, @basicInfo, @fleetDetails, @maintenance, @leasing, @documents, @createdAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                basicInfo: JSON.stringify(r.basicInfo),
                                fleetDetails: JSON.stringify(r.fleetDetails),
                                maintenance: JSON.stringify(r.maintenance),
                                leasing: JSON.stringify(r.leasing),
                                documents: JSON.stringify(r.documents),
                                createdAt: r.createdAt || new Date().toISOString()
                            });
                        } else if (table === 'employees') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO employees (id, employeeNumber, personalData, bankDetails, employment, additionalInfo, weeklySchedule, documents, avatar, createdAt, userId) VALUES (@id, @employeeNumber, @personalData, @bankDetails, @employment, @additionalInfo, @weeklySchedule, @documents, @avatar, @createdAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                personalData: JSON.stringify(r.personalData),
                                bankDetails: JSON.stringify(r.bankDetails),
                                employment: JSON.stringify(r.employment),
                                additionalInfo: JSON.stringify(r.additionalInfo),
                                weeklySchedule: JSON.stringify(r.weeklySchedule),
                                documents: JSON.stringify(r.documents),
                                avatar: r.avatar || null,
                                createdAt: r.createdAt || new Date().toISOString()
                            });
                        } else if (table === 'time_entries') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO time_entries (id, employeeId, date, startTime, endTime, duration, overtime, location, type, projectId, serviceId, description, userId, createdAt) VALUES (@id, @employeeId, @date, @startTime, @endTime, @duration, @overtime, @location, @type, @projectId, @serviceId, @description, @userId, @createdAt)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                startTime: r.startTime || null,
                                endTime: r.endTime || null,
                                duration: r.duration || 0,
                                overtime: r.overtime || 0,
                                location: r.location || null,
                                type: r.type || null,
                                projectId: r.projectId || null,
                                serviceId: r.serviceId || null,
                                description: r.description || null,
                                createdAt: r.createdAt || new Date().toISOString()
                            });
                        } else if (table === 'timesheets') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO timesheets (id, employeeId, month, status, finalizedAt, userId) VALUES (@id, @employeeId, @month, @status, @finalizedAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                status: r.status || 'draft',
                                finalizedAt: r.finalizedAt || null
                            });
                        } else if (table === 'todos') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO todos (id, task, completed, priority, createdAt, userId) VALUES (@id, @task, @completed, @priority, @createdAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                completed: r.completed ? 1 : 0,
                                priority: r.priority || 'medium',
                                createdAt: r.createdAt || new Date().toISOString()
                            });
                        } else if (table === 'calendar_events') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO calendar_events (id, title, description, startDate, endDate, isAllDay, type, color, location, attendees, projectId, startTime, endTime, createdAt, userId) VALUES (@id, @title, @description, @startDate, @endDate, @isAllDay, @type, @color, @location, @attendees, @projectId, @startTime, @endTime, @createdAt, @userId)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                isAllDay: r.isAllDay ? 1 : 0,
                                attendees: JSON.stringify(r.attendees),
                                description: r.description || null,
                                type: r.type || 'event',
                                color: r.color || 'blue',
                                location: r.location || null,
                                projectId: r.projectId || null,
                                startTime: r.startTime || null,
                                endTime: r.endTime || null,
                                createdAt: r.createdAt || new Date().toISOString()
                            });
                        } else if (table === 'services') {
                            const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO services (id, name, title, description, category, price, unit, userId, createdAt, updatedAt) VALUES (@id, @name, @title, @description, @category, @price, @unit, @userId, @createdAt, @updatedAt)`);
                            for (const r of rows) stmt.run({
                                ...r,
                                userId: currentUserId,
                                name: r.title || r.name,
                                title: r.title || r.name,
                                description: r.description || null,
                                category: r.category || 'general',
                                price: r.price || 0,
                                unit: r.unit || 'Stk',
                                createdAt: r.createdAt || new Date().toISOString(),
                                updatedAt: r.updatedAt || new Date().toISOString()
                            });
                        }
                        count += rows.length;
                    }
                }
                return count;
            });
            totalRestored = transaction(data);
        }

        console.log(`--- IMPORT SUCCESSFUL: ${totalRestored} rows total ---`);
        return NextResponse.json({
            message: 'Backup erfolgreich wiederhergestellt.',
            rowCount: totalRestored
        });

    } catch (error: any) {
        console.error('CRITICAL: Backup restore failed:', error);
        return NextResponse.json({
            message: 'Daten-Wiederherstellung fehlgeschlagen.',
            error: error.message
        }, { status: 500 });
    }
}
