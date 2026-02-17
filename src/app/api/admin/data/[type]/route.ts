import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UnifiedDB, isWeb } from '@/lib/database';
import { checkAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: { type: string } }
) {
    const admin = await checkAdmin();
    console.log(`[AdminExplorerAPI] GET [${params.type}] - checkAdmin result:`, !!admin);

    if (!admin) {
        return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });
    }

    const { type } = params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    try {
        // If we have an admin client, use it to bypass RLS and see everything
        if (supabaseAdmin) {
            console.log(`[AdminExplorerAPI] Using supabaseAdmin for ${type}`);
            let query = supabaseAdmin.from(type).select('*');
            if (targetUserId) {
                query = query.eq('userId', targetUserId);
            }

            const { data, error } = await query;
            if (error) {
                console.error(`[AdminExplorerAPI] Supabase Admin Fetch Error [${type}]:`, error);
                throw error;
            }
            return NextResponse.json(data);
        }

        // Fallback for Web/Supplied Supabase client (limited by RLS)
        if (isWeb) {
            console.warn(`[AdminExplorerAPI] supabaseAdmin not available, falling back to anon client for ${type} (RLS limited)`);
            let query = supabase.from(type).select('*');
            if (targetUserId) {
                query = query.eq('userId', targetUserId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return NextResponse.json(data);
        } else {
            // Local SQLite fallback
            console.log(`[AdminExplorerAPI] Using local SQLite for ${type}`);
            let sql = `SELECT * FROM ${type}`;
            let paramsArr: any[] = [];

            if (targetUserId) {
                sql += ' WHERE userId = ?';
                paramsArr.push(targetUserId);
            }

            const stmt = sqliteDb.prepare(sql);
            const rows = stmt.all(...paramsArr);

            const parsedRows = rows.map((row: any) => {
                const refined = { ...row };
                for (const key in refined) {
                    if (typeof refined[key] === 'string' && (refined[key].startsWith('{') || refined[key].startsWith('['))) {
                        try {
                            refined[key] = JSON.parse(refined[key]);
                        } catch (e) { /* ignore */ }
                    }
                }
                // Booleans for SQLite mapping
                ['reverseChargeEnabled', 'isReverseCharge', 'completed'].forEach(field => {
                    if (refined[field] !== undefined) refined[field] = !!refined[field];
                });
                return refined;
            });

            return NextResponse.json(parsedRows);
        }
    } catch (e: any) {
        console.error(`Admin GET [${type}] error:`, e);
        return NextResponse.json({ error: `Failed to fetch ${type}: ${e.message}` }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { type: string } }
) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });

    const { type } = params;
    try {
        const data = await request.json();
        const userId = data.userId;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required in data for global admin edits' }, { status: 400 });
        }

        // Use Admin client to bypass RLS for edits
        if (supabaseAdmin) {
            const { error } = await supabaseAdmin.from(type).upsert(data);
            if (error) throw error;
        } else if (isWeb) {
            const { error } = await supabase.from(type).upsert(data);
            if (error) throw error;
        } else {
            // SQLite local logic
            const keys = Object.keys(data);
            const columns = keys.join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const sql = `INSERT OR REPLACE INTO ${type} (${columns}) VALUES (${placeholders})`;

            const values = keys.map(k => {
                const val = data[k];
                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                if (typeof val === 'boolean') return val ? 1 : 0;
                return val;
            });

            sqliteDb.prepare(sql).run(...values);
            UnifiedDB.syncToCloud(type, data, userId);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(`Admin POST [${type}] error:`, e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { type: string } }
) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 });

    const { type } = params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        if (supabaseAdmin) {
            const { error } = await supabaseAdmin.from(type).delete().eq('id', id);
            if (error) throw error;
        } else if (isWeb) {
            const { error } = await supabase.from(type).delete().eq('id', id);
            if (error) throw error;
        } else {
            sqliteDb.prepare(`DELETE FROM ${type} WHERE id = ?`).run(id);
            if (userId) {
                supabase.from(type).delete().eq('id', id).catch(e => console.error(e));
            }
        }
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(`Admin DELETE [${type}] error:`, e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
