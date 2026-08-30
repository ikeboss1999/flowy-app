import { supabaseAdmin } from './supabase-admin';

export async function runTrackedSystemJob<T extends Record<string, unknown>>(jobName: string, task: () => Promise<T>): Promise<T> {
    if (!supabaseAdmin) return task();
    const startedAt = new Date().toISOString();
    const { error: startError } = await supabaseAdmin.from('admin_system_jobs').upsert({ job_name: jobName, status: 'running', started_at: startedAt, completed_at: null, result: {}, last_error: null }, { onConflict: 'job_name' });
    if (startError) console.warn(`[SystemJob:${jobName}] tracking unavailable:`, startError.message);
    try {
        const result = await task();
        await supabaseAdmin.from('admin_system_jobs').upsert({ job_name: jobName, status: 'success', started_at: startedAt, completed_at: new Date().toISOString(), result, last_error: null }, { onConflict: 'job_name' });
        return result;
    } catch (error) {
        await supabaseAdmin.from('admin_system_jobs').upsert({ job_name: jobName, status: 'failed', started_at: startedAt, completed_at: new Date().toISOString(), result: {}, last_error: error instanceof Error ? error.message : 'Unbekannter Fehler' }, { onConflict: 'job_name' });
        throw error;
    }
}
