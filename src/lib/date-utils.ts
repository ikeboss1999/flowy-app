/**
 * Returns a date string in "YYYY-MM-DD" format, strictly based on local time.
 * This avoids the UTC shift that occurs with toISOString().
 * e.g., 2026-01-01 00:00:00 (Local) -> "2026-01-01"
 *       (whereas toISOString might return "2025-12-31" if timezone is +01:00)
 */
export function toLocalISOString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Returns a month string in "YYYY-MM" format, strictly based on local time.
 */
export function toLocalMonthString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
