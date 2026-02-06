import React, { forwardRef } from 'react';
import { TimeEntry, TimeEntryType } from '@/types/time-tracking';
import { CompanyData } from '@/types/company';
import { Employee } from '@/types/employee';
import { cn } from '@/lib/utils';

interface TimeTrackingPDFProps {
    entries: TimeEntry[];
    employee: Employee;
    month: string; // YYYY-MM
    companySettings: CompanyData;
}

export const TimeTrackingPDF = forwardRef<HTMLDivElement, TimeTrackingPDFProps>(({ entries, employee, month, companySettings }, ref) => {
    const logoSrc = companySettings.logo;

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    };

    const calculateHours = (entry: TimeEntry) => {
        if (entry.type !== 'WORK') return 0;

        // Use duration if available (preferred)
        if (typeof entry.duration === 'number') {
            return entry.duration / 60;
        }

        // Fallback to start/end calculation
        const start = new Date(`1970-01-01T${entry.startTime}`);
        const end = new Date(`1970-01-01T${entry.endTime}`);
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return Math.max(0, diff); // No break subtraction
    };

    const totalHours = entries.reduce((acc, entry) => acc + calculateHours(entry), 0);

    const getTypeLabel = (type: TimeEntryType) => {
        switch (type) {
            case 'WORK': return 'Gearbeitet';
            case 'VACATION': return 'Urlaub';
            case 'SICK': return 'Krank';
            case 'HOLIDAY': return 'Feiertag';
            default: return type;
        }
    };

    // Helper to get all days of the selected month
    const generateMonthDays = () => {
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const days = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, monthNum - 1, d);
            const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const entry = entries.find(e => e.date === dateStr);
            days.push({ date, entry });
        }
        return days;
    };

    const monthDays = generateMonthDays();
    const totalOvertime = monthDays.reduce((acc, { entry }) => {
        if (!entry) return acc;
        return acc + (entry.overtime || 0);
    }, 0);

    return (
        <div ref={ref} style={{
            width: '794px',
            height: '1123px',
            padding: '40px 50px',
            backgroundColor: 'white',
            color: '#1e293b',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10pt',
            lineHeight: '1.2',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            margin: '0 auto',
        }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h1 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#2563eb', margin: '0 0 2px 0', letterSpacing: '0.05em' }}>STUNDENZETTEL</h1>
                    <p style={{ color: '#64748b', fontSize: '10pt', margin: 0 }}>{formatMonth(month)}</p>

                    <div style={{ marginTop: '40px' }}>
                        <p style={{ fontSize: '9pt', color: '#64748b', margin: '0 0 2px 0' }}>Mitarbeiter</p>
                        <p style={{ fontSize: '11pt', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{employee.personalData.firstName} {employee.personalData.lastName}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ height: '35px', objectFit: 'contain', marginBottom: '20px' }} />
                    ) : (
                        <div style={{ fontSize: '16pt', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', marginBottom: '20px' }}>
                            <span style={{ color: '#f43f5e', marginRight: '2px' }}>//</span>{companySettings.companyName.toUpperCase()}
                        </div>
                    )}
                    <div style={{ textAlign: 'right', fontSize: '9pt', color: '#334155', display: 'grid', gridTemplateColumns: '120px 60px', gap: '4px' }}>
                        <span style={{ color: '#64748b' }}>Gesamtstunden</span>
                        <span style={{ fontWeight: 'bold', textAlign: 'right' }}>{totalHours.toFixed(2).replace('.', ',')} Std.</span>
                        <span style={{ color: '#64748b' }}>Schlechtwetter</span>
                        <span style={{ fontWeight: 'bold', textAlign: 'right' }}>0,00 Std.</span>
                        <span style={{ color: '#64748b' }}>davon Überstunden</span>
                        <span style={{ fontWeight: 'bold', textAlign: 'right' }}>{totalOvertime.toFixed(2).replace('.', ',')} Std.</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1.5px solid #334155', borderBottom: '1.5px solid #334155' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: '9pt', width: '35px' }}>Tag</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: '9pt', width: '75px' }}>Datum</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: '9pt', width: '85px' }}>Status</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: '9pt', width: '45px' }}>Std.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: '9pt', width: '95px' }}>Schlechtwetter</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: '9pt', width: '65px' }}>Überstd.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: '9pt' }}>Baustelle</th>
                    </tr>
                </thead>
                <tbody>
                    {monthDays.map(({ date, entry }) => {
                        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const hours = entry ? calculateHours(entry) : 0;
                        const overtime = entry?.overtime !== undefined ? entry.overtime : 0;

                        return (
                            <tr key={date.toISOString()} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isWeekend ? '#f8fafc' : 'transparent' }}>
                                <td style={{ padding: '3px 4px', fontSize: '8.5pt', color: isWeekend ? '#3b82f6' : '#0f172a', fontWeight: isWeekend ? 'bold' : 'normal' }}>{dayName}</td>
                                <td style={{ padding: '3px 4px', fontSize: '8.5pt', color: '#64748b' }}>{date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td style={{ padding: '3px 4px', fontSize: '8.5pt' }}>
                                    {entry ? (
                                        <span style={{
                                            color: entry.type === 'WORK' ? '#10b981' : entry.type === 'SICK' ? '#ef4444' : '#f59e0b',
                                            fontWeight: 'bold'
                                        }}>
                                            {getTypeLabel(entry.type)}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#94a3b8' }}>{isWeekend ? 'Frei' : '-'}</span>
                                    )}
                                </td>
                                <td style={{ padding: '3px 4px', fontSize: '8.5pt', textAlign: 'right', fontWeight: hours > 0 ? 'bold' : 'normal' }}>
                                    {hours > 0 ? hours.toFixed(1).replace('.', ',') : '-'}
                                </td>
                                <td style={{ padding: '3px 4px', fontSize: '8.5pt', textAlign: 'right', color: '#cbd5e1' }}>-</td>
                                <td style={{ padding: '3px 4px', fontSize: '8.5pt', textAlign: 'right', fontWeight: overtime > 0 ? 'bold' : 'normal' }}>
                                    {overtime > 0 ? overtime.toFixed(1).replace('.', ',') : '0,0'}
                                </td>
                                <td style={{ padding: '3px 4px', fontSize: '8.5pt', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {entry?.location || entry?.projectId || entry?.notes || '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Footer Notice */}
            <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: '10px' }}>
                <p style={{ fontSize: '8pt', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Dieses Dokument wurde elektronisch erstellt.</p>
            </div>
        </div>
    );
});

TimeTrackingPDF.displayName = "TimeTrackingPDF";
