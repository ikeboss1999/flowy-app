import { NextResponse } from 'next/server';
import sqliteDb from '@/lib/sqlite';
import { UnifiedDB, isWeb } from '@/lib/database';
import { getUserSession } from '@/lib/auth-server';
import { writeLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const session = await getUserSession();
    const userId = session?.userId;
    const { id } = params;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isWeb) {
            const client = UnifiedDB.getAuthenticatedClient(session);
            const { error } = await client.from('employees').delete().eq('id', id).eq('userId', userId);
            if (error) throw error;
        } else {
            // Check ownership
            const existing = sqliteDb.prepare('SELECT userId FROM employees WHERE id = ?').get(id) as any;
            if (existing && existing.userId !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            sqliteDb.prepare('DELETE FROM employees WHERE id = ? AND userId = ?').run(id, userId);
            writeLog('EmployeeAPI', `Direct delete successful for ID: ${id}`);

            // Silent Sync
            const client = UnifiedDB.getAuthenticatedClient(session);
            client.from('employees').delete().eq('id', id).eq('userId', userId).then(({ error }) => {
                if (error) {
                    writeLog('EmployeeAPI', `Direct cloud delete failed for ID: ${id}. Error: ${error.message}`);
                } else {
                    writeLog('EmployeeAPI', `Direct cloud delete successful for ID: ${id}`);
                }
            });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
