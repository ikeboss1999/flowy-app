
import { supabase } from './supabase';

export interface BackupMetadata {
    name: string;
    updated_at: string;
    size: number;
}

const BUCKET_NAME = 'backups';

/**
 * Uploads a JSON backup object to Supabase Storage.
 * Saves as: backups/{userId}/latest.json
 */
export async function uploadToCloud(backupData: any, userId: string): Promise<{ data: any; error: any }> {
    try {
        if (!userId) throw new Error("User ID is required for cloud backup.");

        const filePath = `${userId}/latest.json`;
        const fileContent = JSON.stringify(backupData, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json' });

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                upsert: true,
                contentType: 'application/json'
            });

        return { data, error };
    } catch (err: any) {
        return { data: null, error: err };
    }
}

/**
 * Downloads the latest backup JSON from Supabase Storage.
 */
export async function downloadFromCloud(userId: string): Promise<{ data: any; error: any }> {
    try {
        if (!userId) throw new Error("User ID is required for cloud restore.");

        const filePath = `${userId}/latest.json`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .download(filePath);

        if (error) throw error;

        // Convert Blob to JSON
        const text = await data.text();
        const jsonData = JSON.parse(text);

        return { data: jsonData, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
}

/**
 * Checks if a backup exists and returns its metadata (last modified time).
 */
export async function getLastBackupInfo(userId: string): Promise<BackupMetadata | null> {
    try {
        if (!userId) return null;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list(`${userId}`); // List files in user folder

        if (error || !data || data.length === 0) return null;

        // Find 'latest.json'
        const file = data.find(f => f.name === 'latest.json');
        if (!file) return null;

        return {
            name: file.name,
            updated_at: file.updated_at || new Date().toISOString(), // Fallback
            size: file.metadata?.size || 0
        };
    } catch (error) {
        console.error("Failed to get backup info", error);
        return null;
    }
}
/**
 * Restores a backup by sending it to the Import API.
 */
export async function restoreFromCloud(backupData: any): Promise<{ error: any }> {
    try {
        const response = await fetch('/api/backup/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupData),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Restore failed");
        }

        return { error: null };
    } catch (error) {
        console.error("Restore failed:", error);
        return { error };
    }
}
