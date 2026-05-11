import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { TimeEntry, TimeEntryType } from '@/types/time-tracking';
import { CompanyData } from '@/types/company';
import { Employee } from '@/types/employee';

export interface TimesheetReactPDFProps {
    entries: TimeEntry[];
    employee: Employee;
    month: string; // YYYY-MM
    companySettings: CompanyData | null;
}

// ─── STYLING ────────────────────────────────────────────────────────────────
// Adjust values here to change the visual appearance of the exported PDF.
const styles = StyleSheet.create({
    // ── Page ──────────────────────────────────────────────────────────────────
    page: {
        paddingTop: 48,       // ← top margin
        paddingBottom: 30,    // ← bottom margin
        paddingLeft: 50,      // ← left margin
        paddingRight: 50,     // ← right margin
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#1e293b',
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    title: {
        fontSize: 20,         // ← "STUNDENZETTEL" size
        fontFamily: 'Helvetica-Bold',
        color: '#2563eb',     // ← title color (blue)
        marginBottom: 4,
    },
    monthText: {
        fontSize: 11,         // ← month label size
        color: '#64748b',
        marginBottom: 28,
    },
    employeeLabel: {
        fontSize: 7.5,        // ← "MITARBEITER" label size
        color: '#94a3b8',
        marginBottom: 2,
    },
    employeeName: {
        fontSize: 13,         // ← employee name size
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
    },

    // ── Header right (logo + summary) ─────────────────────────────────────────
    headerRight: {
        alignItems: 'flex-end',
    },
    logo: {
        maxHeight: 38,        // ← logo height
        maxWidth: 100,        // ← logo max width
        marginBottom: 18,     // ← gap below logo
    },
    companyFallback: {
        fontSize: 15,         // ← fallback company name size (no logo)
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        marginBottom: 18,
    },
    summaryGrid: {
        flexDirection: 'column',
    },
    summaryRow: {
        flexDirection: 'row',
        marginBottom: 3,      // ← gap between summary lines
    },
    summaryLabel: {
        fontSize: 8,          // ← summary label size
        color: '#64748b',
        width: 130,           // ← label column width
    },
    summaryValue: {
        fontSize: 9,          // ← summary value size
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        width: 65,            // ← value column width
        textAlign: 'right',
    },

    // ── Table ─────────────────────────────────────────────────────────────────
    tableContainer: {
        borderTopWidth: 1.5,
        borderTopColor: '#334155',
        borderBottomWidth: 1.5,
        borderBottomColor: '#334155',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 0.75,
        borderBottomColor: '#334155',
        paddingVertical: 7,   // ← header row vertical padding
        paddingHorizontal: 4,
    },
    tableHeaderText: {
        fontSize: 8,          // ← column header font size
        fontFamily: 'Helvetica-Bold',
        color: '#334155',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e2e8f0',
        paddingVertical: 4,   // ← data row height (increase for more spacing)
        paddingHorizontal: 4,
    },

    // ── Column widths (total ≈ 495pt = A4 595 – 50 left – 50 right) ──────────
    colDay: { width: 28 },  // ← "Mo", "Di" etc.
    colDate: { width: 62 },  // ← "01.01.2025"
    colStatus: { width: 78 },  // ← "Arbeit", "Krank" etc.
    colHours: { width: 30 },  // ← work hours
    colSW: { width: 72 },  // ← bad-weather hours
    colOvertime: { width: 60 },  // ← overtime hours
    colLocation: { width: 55, marginLeft: 20 },    // ← job site (fills remaining width)

    // ── Cell text variants ────────────────────────────────────────────────────
    cell: { fontSize: 8.5, color: '#0f172a' },
    cellMuted: { fontSize: 8.5, color: '#64748b' },
    cellRight: { fontSize: 8.5, color: '#cbd5e1', textAlign: 'right' },
    cellRightBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right' },

    // ── Footer ────────────────────────────────────────────────────────────────
    footerText: {
        fontSize: 7,          // ← footer note size
        color: '#94a3b8',
    },
});

// ─── HELPERS ────────────────────────────────────────────────────────────────
const getTypeLabel = (type: TimeEntryType): string => {
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

const getTypeColor = (type: TimeEntryType): string => {
    switch (type) {
        case 'WORK': return '#10b981';
        case 'SICK': return '#ef4444';
        case 'OFF': return '#94a3b8';
        case 'VACATION': return '#3b82f6';
        case 'HOLIDAY': return '#8b5cf6';
        default: return '#f59e0b';
    }
};

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export function TimesheetReactPDF({ entries, employee, month, companySettings }: TimesheetReactPDFProps) {

    const formatMonth = (monthStr: string) => {
        const [y, m] = monthStr.split('-');
        return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    };

    const calcWorkHours = (entry: TimeEntry): number => {
        if (entry.type !== 'WORK' && entry.type !== 'WORK_BAD_WEATHER') return 0;
        const total = typeof entry.duration === 'number' ? entry.duration / 60 : (() => {
            if (!entry.startTime || !entry.endTime) return 0;
            const s = new Date(`1970-01-01T${entry.startTime}`);
            const e = new Date(`1970-01-01T${entry.endTime}`);
            return Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60));
        })();
        if (entry.type === 'WORK_BAD_WEATHER') {
            const sw = typeof entry.badWeatherDuration === 'number' ? entry.badWeatherDuration / 60 : total / 2;
            return Math.max(0, total - sw);
        }
        return total;
    };

    const calcSWHours = (entry: TimeEntry): number => {
        if (entry.type !== 'BAD_WEATHER' && entry.type !== 'WORK_BAD_WEATHER') return 0;
        if (entry.type === 'BAD_WEATHER') return typeof entry.duration === 'number' ? entry.duration / 60 : 0;
        if (typeof entry.badWeatherDuration === 'number') return entry.badWeatherDuration / 60;
        return typeof entry.duration === 'number' ? entry.duration / 120 : 0;
    };

    const generateDays = () => {
        const [y, m] = month.split('-').map(Number);
        const count = new Date(y, m, 0).getDate();
        return Array.from({ length: count }, (_, i) => {
            const d = i + 1;
            const date = new Date(y, m - 1, d);
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            return { date, entry: entries.find(e => e.date === dateStr) };
        });
    };

    const days = generateDays();
    const totalHours = entries.reduce((s, e) => s + calcWorkHours(e), 0);
    const totalSW = entries.reduce((s, e) => s + calcSWHours(e), 0);
    const totalOvertime = days.reduce((s, { entry }) => s + (entry?.overtime || 0), 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ── HEADER ── */}
                <View style={styles.header}>
                    {/* Left: title + employee */}
                    <View>
                        <Text style={styles.title}>STUNDENZETTEL</Text>
                        <Text style={styles.monthText}>{formatMonth(month)}</Text>
                        <Text style={styles.employeeLabel}>MITARBEITER</Text>
                        <Text style={styles.employeeName}>
                            {employee.personalData.firstName} {employee.personalData.lastName}
                        </Text>
                    </View>

                    {/* Right: logo + summary */}
                    <View style={styles.headerRight}>
                        {companySettings?.logo ? (
                            <Image src={companySettings.logo} style={styles.logo} />
                        ) : (
                            <Text style={styles.companyFallback}>
                                {companySettings?.companyName?.toUpperCase() ?? 'FIRMA'}
                            </Text>
                        )}
                        <View style={styles.summaryGrid}>
                            {[
                                { label: 'Gesamtstunden', value: `${totalHours.toFixed(2).replace('.', ',')} Std.` },
                                { label: 'Schlechtwetter', value: `${totalSW.toFixed(2).replace('.', ',')} Std.` },
                                { label: 'davon Überstunden', value: `${totalOvertime.toFixed(2).replace('.', ',')} Std.` },
                            ].map(item => (
                                <View key={item.label} style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{item.label}</Text>
                                    <Text style={styles.summaryValue}>{item.value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── TABLE ── */}
                <View style={styles.tableContainer}>
                    {/* Header row */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.colDay]}>Tag</Text>
                        <Text style={[styles.tableHeaderText, styles.colDate]}>Datum</Text>
                        <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                        <Text style={[styles.tableHeaderText, styles.colHours, { textAlign: 'right' }]}>Std.</Text>
                        <Text style={[styles.tableHeaderText, styles.colSW, { textAlign: 'right' }]}>Schlechtwetter</Text>
                        <Text style={[styles.tableHeaderText, styles.colOvertime, { textAlign: 'right' }]}>Überstd.</Text>
                        <Text style={[styles.tableHeaderText, styles.colLocation]}>Baustelle</Text>
                    </View>

                    {/* Data rows */}
                    {days.map(({ date, entry }) => {
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const hours = entry ? calcWorkHours(entry) : 0;
                        const sw = entry ? calcSWHours(entry) : 0;
                        const overtime = entry?.overtime ?? 0;
                        const rowBg = isWeekend ? { backgroundColor: '#f8fafc' } : {};

                        return (
                            <View key={date.toISOString()} style={[styles.tableRow, rowBg]}>
                                <Text style={[styles.cell, styles.colDay,
                                isWeekend ? { color: '#3b82f6', fontFamily: 'Helvetica-Bold' } : {}]}>
                                    {DAY_NAMES[date.getDay()]}
                                </Text>
                                <Text style={[styles.cellMuted, styles.colDate]}>
                                    {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </Text>
                                <Text style={[styles.cell, styles.colStatus,
                                entry ? { color: getTypeColor(entry.type) } : { color: '#94a3b8' }]}>
                                    {entry ? getTypeLabel(entry.type) : (isWeekend ? 'Frei' : '-')}
                                </Text>
                                <Text style={[hours > 0 ? styles.cellRightBold : styles.cellRight, styles.colHours]}>
                                    {hours > 0 ? hours.toFixed(1).replace('.', ',') : '-'}
                                </Text>
                                <Text style={[sw > 0 ? styles.cellRightBold : styles.cellRight, styles.colSW]}>
                                    {sw > 0 ? sw.toFixed(1).replace('.', ',') : '-'}
                                </Text>
                                <Text style={[overtime > 0 ? styles.cellRightBold : styles.cellRight, styles.colOvertime]}>
                                    {overtime > 0 ? overtime.toFixed(1).replace('.', ',') : '0,0'}
                                </Text>
                                <Text style={[styles.cell, styles.colLocation]} numberOfLines={1}>
                                    {(entry as any)?.location || (entry as any)?.notes || '-'}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Spacer pushes footer to bottom */}
                <View style={{ flexGrow: 1 }} />

                {/* ── FOOTER ── */}
                <View style={{ alignItems: 'center', paddingTop: 12 }}>
                    <Text style={styles.footerText}>Dieses Dokument wurde elektronisch erstellt.</Text>
                </View>

            </Page>
        </Document>
    );
}
