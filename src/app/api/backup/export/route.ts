import { NextResponse } from 'next/server';
import db from '@/lib/sqlite';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('--- BACKUP EXPORT START ---');

        // Helper function to safely fetch table data
        const getTableData = (table: string) => {
            try {
                return db.prepare(`SELECT * FROM ${table}`).all();
            } catch (e) {
                console.warn(`Table ${table} not found or inaccessible.`);
                return [];
            }
        };

        const data = {
            projects: getTableData('projects'),
            customers: getTableData('customers'),
            invoices: getTableData('invoices'),
            settings: getTableData('settings'),
            vehicles: getTableData('vehicles'),
            employees: getTableData('employees'),
            time_entries: getTableData('time_entries'),
            timesheets: getTableData('timesheets'),
            todos: getTableData('todos'),
            calendar_events: getTableData('calendar_events'),
            services: getTableData('services'),
            exportDate: new Date().toISOString(),
            version: '2.2'
        };

        const totalRows = Object.values(data)
            .filter(val => Array.isArray(val))
            .reduce((acc, val: any) => acc + val.length, 0);

        console.log(`Export successful: ${totalRows} rows collected.`);
        console.log('--- BACKUP EXPORT END ---');

        return NextResponse.json(data);
    } catch (error) {
        console.error('Backup export failed:', error);
        return NextResponse.json({ message: 'Backup export failed' }, { status: 500 });
    }
}
