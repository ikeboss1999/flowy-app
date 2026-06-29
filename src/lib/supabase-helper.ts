import { PostgrestError } from '@supabase/supabase-js';

/**
 * Safely fetches the 'created_by' value from a table.
 * If the column or record does not exist, returns null.
 */
export async function safeGetCreatedBy(
    client: any,
    table: string,
    id: string
): Promise<string | null> {
    try {
        const { data, error } = await client
            .from(table)
            .select('created_by')
            .eq('id', id)
            .maybeSingle();
        
        if (error) {
            return null;
        }
        return data?.created_by || null;
    } catch (e) {
        return null;
    }
}

/**
 * Safely performs an upsert. If the table does not have 'created_by' or 'updated_by'
 * columns, it automatically retries the operation without these properties to prevent errors.
 */
export async function safeUpsert(
    client: any,
    table: string,
    data: any
): Promise<{ error: PostgrestError | null; data: any }> {
    const { error, data: result } = await client
        .from(table)
        .upsert(data)
        .select()
        .maybeSingle();

    if (error && (
        error.message.includes('created_by') || 
        error.message.includes('updated_by') || 
        error.code === 'PGRST204' || 
        error.code === '42703'
    )) {
        console.warn(`[SupabaseHelper] Upsert to "${table}" failed due to missing audit columns. Retrying...`);
        const { created_by, updated_by, ...cleanedData } = data;
        return await client
            .from(table)
            .upsert(cleanedData)
            .select()
            .maybeSingle();
    }

    return { error, data: result };
}

/**
 * Safely performs an insert. If the table does not have 'created_by' or 'updated_by'
 * columns, it automatically retries the operation without these properties to prevent errors.
 */
export async function safeInsert(
    client: any,
    table: string,
    data: any
): Promise<{ error: PostgrestError | null; data: any }> {
    const { error, data: result } = await client
        .from(table)
        .insert(data)
        .select()
        .maybeSingle();

    if (error && (
        error.message.includes('created_by') || 
        error.message.includes('updated_by') || 
        error.code === 'PGRST204' || 
        error.code === '42703'
    )) {
        console.warn(`[SupabaseHelper] Insert to "${table}" failed due to missing audit columns. Retrying...`);
        const { created_by, updated_by, ...cleanedData } = data;
        return await client
            .from(table)
            .insert(cleanedData)
            .select()
            .maybeSingle();
    }

    return { error, data: result };
}

/**
 * Safely performs an update. If the table does not have 'created_by' or 'updated_by'
 * columns, it automatically retries the operation without these properties to prevent errors.
 */
export async function safeUpdate(
    client: any,
    table: string,
    data: any,
    matchFields: Record<string, any>
): Promise<{ error: PostgrestError | null; data: any }> {
    let query = client.from(table).update(data);
    for (const [key, value] of Object.entries(matchFields)) {
        query = query.eq(key, value);
    }
    const { error, data: result } = await query.select().maybeSingle();

    if (error && (
        error.message.includes('created_by') || 
        error.message.includes('updated_by') || 
        error.code === 'PGRST204' || 
        error.code === '42703'
    )) {
        console.warn(`[SupabaseHelper] Update to "${table}" failed due to missing audit columns. Retrying...`);
        const { created_by, updated_by, ...cleanedData } = data;
        let retryQuery = client.from(table).update(cleanedData);
        for (const [key, value] of Object.entries(matchFields)) {
            retryQuery = retryQuery.eq(key, value);
        }
        return await retryQuery.select().maybeSingle();
    }

    return { error, data: result };
}
