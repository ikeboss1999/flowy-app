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
        if (entry.type !== 'WORK' && entry.type !== 'WORK_BAD_WEATHER') return 0;

        // Use duration if available (preferred)
        const totalDuration = typeof entry.duration === 'number' ? entry.duration : 0;

        if (totalDuration === 0 && !entry.startTime) return 0;

        let result = 0;
        if (typeof entry.duration === 'number') {
            result = entry.duration / 60;
        } else {
            const start = new Date(`1970-01-01T${entry.startTime}`);
            const end = new Date(`1970-01-01T${entry.endTime}`);
            const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            result = Math.max(0, diff);
        }

        if (entry.type === 'WORK_BAD_WEATHER') {
            // Subtract manual SW hours if available, otherwise 50/50
            const swHours = typeof entry.badWeatherDuration === 'number' ? entry.badWeatherDuration / 60 : result / 2;
            return Math.max(0, result - swHours);
        }

        return result;
    };

    const calculateBadWeatherHours = (entry: TimeEntry) => {
        if (entry.type !== 'BAD_WEATHER' && entry.type !== 'WORK_BAD_WEATHER') return 0;

        if (entry.type === 'BAD_WEATHER') {
            if (typeof entry.duration === 'number') {
                return entry.duration / 60;
            }
            const start = new Date(`1970-01-01T${entry.startTime}`);
            const end = new Date(`1970-01-01T${entry.endTime}`);
            const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return Math.max(0, diff);
        }

        // For WORK_BAD_WEATHER, use manual input or 50/50 fallback
        if (typeof entry.badWeatherDuration === 'number') {
            return entry.badWeatherDuration / 60;
        }

        const totalHours = typeof entry.duration === 'number' ? entry.duration / 60 : 0;
        return totalHours / 2;
    };

    const totalHours = entries.reduce((acc, entry) => acc + calculateHours(entry), 0);
    const totalBadWeather = entries.reduce((acc, entry) => acc + calculateBadWeatherHours(entry), 0);

    const getTypeLabel = (type: TimeEntryType) => {
        switch (type) {
            case 'WORK': return 'Arbeit';
            case 'BAD_WEATHER': return 'Schlechtwetter';
            case 'WORK_BAD_WEATHER': return 'Arbeit + SW';
            case 'VACATION': return 'Urlaub';
            case 'SICK': return 'Krank';
            case 'HOLIDAY': return 'Feiertag';
            case 'OFF': return 'Frei';
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
            padding: '60px 70px',
            backgroundColor: 'white',
            color: '#1e293b',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.4',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            margin: '0 auto',
        }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '45px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h1 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#2563eb', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>STUNDENZETTEL</h1>
                    <p style={{ color: '#64748b', fontSize: '12pt', fontWeight: '500', margin: 0 }}>{formatMonth(month)}</p>

                    <div style={{ marginTop: '50px' }}>
                        <p style={{ fontSize: '10pt', color: '#64748b', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitarbeiter</p>
                        <p style={{ fontSize: '14pt', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{employee.personalData.firstName} {employee.personalData.lastName}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ height: '42px', objectFit: 'contain', marginBottom: '25px' }} />
                    ) : (
                        <div style={{ fontSize: '18pt', fontWeight: 900, fontStyle: 'italic', color: '#0f172a', marginBottom: '25px' }}>
                            <span style={{ color: '#f43f5e', marginRight: '2px' }}>//</span>{companySettings.companyName.toUpperCase()}
                        </div>
                    )}
                    <div style={{ textAlign: 'right', fontSize: '10pt', color: '#334155', display: 'grid', gridTemplateColumns: '140px 70px', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}>Gesamtstunden</span>
                        <span style={{ fontWeight: 'bold', textAlign: 'right', fontSize: '11pt' }}>{totalHours.toFixed(2).replace('.', ',')} Std.</span>
                        <span style={{ color: '#64748b' }}>Schlechtwetter</span>
                        <span style={{ fontWeight: 'bold', textAlign: 'right', fontSize: '11pt' }}>{totalBadWeather.toFixed(2).replace('.', ',')} Std.</span>
                        <span style={{ color: '#64748b' }}>davon Überstunden</span>
                        <span style={{ fontWeight: 'bold', textAlign: 'right', fontSize: '11pt' }}>{totalOvertime.toFixed(2).replace('.', ',')} Std.</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #334155', borderBottom: '2px solid #334155' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '10px 6px', textAlign: 'left', fontSize: '10pt', width: '40px' }}>Tag</th>
                        <th style={{ padding: '10px 6px', textAlign: 'left', fontSize: '10pt', width: '85px' }}>Datum</th>
                        <th style={{ padding: '10px 6px', textAlign: 'left', fontSize: '10pt', width: '95px' }}>Status</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right', fontSize: '10pt', width: '55px' }}>Std.</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right', fontSize: '10pt', width: '105px' }}>Schlechtwetter</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right', fontSize: '10pt', width: '75px' }}>Überstd.</th>
                        <th style={{ padding: '10px 6px', textAlign: 'left', fontSize: '10pt' }}>Baustelle</th>
                    </tr>
                </thead>
                <tbody>
                    {monthDays.map(({ date, entry }) => {
                        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const hours = entry ? calculateHours(entry) : 0;
                        const swHours = entry ? calculateBadWeatherHours(entry) : 0;
                        const overtime = entry?.overtime !== undefined ? entry.overtime : 0;

                        return (
                            <tr key={date.toISOString()} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isWeekend ? '#f8fafc' : 'transparent' }}>
                                <td style={{ padding: '5px 6px', fontSize: '9pt', color: isWeekend ? '#3b82f6' : '#0f172a', fontWeight: isWeekend ? 'bold' : 'normal' }}>{dayName}</td>
                                <td style={{ padding: '5px 6px', fontSize: '9pt', color: '#64748b' }}>{date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td style={{ padding: '5px 6px', fontSize: '9pt' }}>
                                    {entry ? (
                                        <span style={{
                                            color: entry.type === 'WORK' ? '#10b981' : entry.type === 'SICK' ? '#ef4444' : entry.type === 'OFF' ? '#94a3b8' : '#f59e0b',
                                            fontWeight: 'bold'
                                        }}>
                                            {getTypeLabel(entry.type)}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#94a3b8' }}>{isWeekend ? 'Frei' : '-'}</span>
                                    )}
                                </td>
                                <td style={{ padding: '5px 6px', fontSize: '9pt', textAlign: 'right', fontWeight: hours > 0 ? 'bold' : 'normal' }}>
                                    {hours > 0 ? hours.toFixed(1).replace('.', ',') : '-'}
                                </td>
                                <td style={{ padding: '5px 6px', fontSize: '9pt', textAlign: 'right', color: swHours > 0 ? '#0f172a' : '#cbd5e1', fontWeight: swHours > 0 ? 'bold' : 'normal' }}>
                                    {swHours > 0 ? swHours.toFixed(1).replace('.', ',') : '-'}
                                </td>
                                <td style={{ padding: '5px 6px', fontSize: '9pt', textAlign: 'right', fontWeight: overtime > 0 ? 'bold' : 'normal' }}>
                                    {overtime > 0 ? overtime.toFixed(1).replace('.', ',') : '0,0'}
                                </td>
                                <td style={{ padding: '5px 6px', fontSize: '9pt', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
