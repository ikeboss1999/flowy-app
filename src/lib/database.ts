
import sqliteDb from './sqlite';
import { supabase } from './supabase';

/**
 * Detection: Is this running in a Web environment (Vercel/Browser) 
 * or in the local Electron app?
 */
export const isWeb = typeof window !== 'undefined' || !!process.env.VERCEL;

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
            const syncData = this.prepareForCloud(data, userId);

            const { error } = await supabase
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
    private static prepareForCloud(data: any, userId: string) {
        const prepare = (item: any) => {
            const refined = { ...item, userId };

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

            return refined;
        };

        return Array.isArray(data) ? data.map(prepare) : prepare(data);
    }
}
