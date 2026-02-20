
import sqliteDb from './sqlite';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import { isWeb } from './is-web';

/**
 * Re-export isWeb for backward compatibility where database.ts is used in server code.
 */
export { isWeb };

export const SCHEMA_KEYS: Record<string, string[]> = {
    customers: ['id', 'name', 'email', 'phone', 'address', 'type', 'status', 'salutation', 'taxId', 'commercialRegisterNumber', 'reverseChargeEnabled', 'defaultPaymentTermId', 'notes', 'lastActivity', 'createdAt', 'updatedAt', 'userId'],
    invoices: ['id', 'invoiceNumber', 'customerId', 'projectId', 'constructionProject', 'paymentPlanItemId', 'billingType', 'issueDate', 'items', 'subtotal', 'taxRate', 'taxAmount', 'totalAmount', 'isReverseCharge', 'status', 'paymentTerms', 'perfFrom', 'perfTo', 'processor', 'subjectExtra', 'partialPaymentNumber', 'previousInvoices', 'dunningLevel', 'lastDunningDate', 'dunningHistory', 'paidAmount', 'paymentDeviation', 'notes', 'createdAt', 'updatedAt', 'userId'],
    projects: ['id', 'name', 'customerId', 'description', 'status', 'address', 'startDate', 'endDate', 'budget', 'paymentPlan', 'createdAt', 'updatedAt', 'userId'],
    employees: ['id', 'employeeNumber', 'personalData', 'bankDetails', 'employment', 'additionalInfo', 'weeklySchedule', 'documents', 'avatar', 'appAccess', 'pendingChanges', 'sharedFolders', 'createdAt', 'updatedAt', 'userId'],
    vehicles: ['id', 'basicInfo', 'fleetDetails', 'maintenance', 'leasing', 'documents', 'createdAt', 'updatedAt', 'userId'],
    settings: ['userId', 'companyData', 'accountSettings', 'invoiceSettings', 'updatedAt'],
    services: ['id', 'name', 'title', 'description', 'category', 'price', 'unit', 'userId', 'createdAt', 'updatedAt'],
    time_entries: ['id', 'employeeId', 'date', 'startTime', 'endTime', 'duration', 'overtime', 'location', 'type', 'projectId', 'serviceId', 'description', 'userId', 'createdAt'],
    todos: ['id', 'task', 'completed', 'priority', 'createdAt', 'userId'],
    calendar_events: ['id', 'title', 'description', 'startDate', 'endDate', 'isAllDay', 'type', 'color', 'location', 'attendees', 'projectId', 'startTime', 'endTime', 'createdAt', 'userId'],
    timesheets: ['id', 'employeeId', 'month', 'status', 'finalizedAt', 'userId']
};

export class UnifiedDB {
    static isWeb = isWeb;

    /**
     * Silent background synchronization.
     * Call this in Electron app after a local write.
     */
    static async syncToCloud(table: string, data: any, userId: string) {
        if (!userId || isWeb) return;

        try {
            console.log(`[BackgroundSync] Syncing ${table} to Supabase...`);

            // Format data for Supabase (e.g. ensure booleans, ensure JSON is object not string)
            const syncData = this.prepareForCloud(table, data, userId);

            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from(table)
                .upsert(syncData);

            if (error) throw error;
            console.log(`[BackgroundSync] ${table} synced successfully.`);
        } catch (err) {
            console.error(`[BackgroundSync] Failed to sync ${table}:`, err);
        }
    }

    /**
     * Prepares local (SQLite style) data for Supabase.
     */
    static prepareForCloud(table: string, data: any, userId: string) {
        const validKeys = SCHEMA_KEYS[table];

        const prepare = (item: any) => {
            const refined: any = { ...item, userId };

            // Convert common SQLite numeric booleans back to real booleans for Postgres
            if (refined.reverseChargeEnabled !== undefined) refined.reverseChargeEnabled = !!refined.reverseChargeEnabled;
            if (refined.isReverseCharge !== undefined) refined.isReverseCharge = !!refined.isReverseCharge;
            if (refined.completed !== undefined) refined.completed = !!refined.completed;
            if (refined.isAllDay !== undefined) refined.isAllDay = !!refined.isAllDay;

            // Convert JSON strings back to objects if they are strings
            for (const key in refined) {
                if (typeof refined[key] === 'string' && (refined[key].startsWith('{') || refined[key].startsWith('['))) {
                    try {
                        refined[key] = JSON.parse(refined[key]);
                    } catch (e) { /* ignore */ }
                }
            }

            // Remove keys not present in Supabase schema to avoid "column not found" errors
            if (validKeys) {
                const sanitized: any = {};
                for (const key of validKeys) {
                    if (refined[key] !== undefined) {
                        sanitized[key] = refined[key];
                    }
                }
                return sanitized;
            }

            return refined;
        };

        return Array.isArray(data) ? data.map(prepare) : prepare(data);
    }
}
