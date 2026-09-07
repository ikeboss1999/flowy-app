type NumberedRecord = Record<string, unknown>;

export function nextYearlySequence(
    records: readonly NumberedRecord[] | undefined,
    year: number,
    field: string,
): number {
    const prefix = `${year}/`;
    const sequences = (records || [])
        .map((record) => String(record[field] ?? '').trim())
        .filter((value) => value.startsWith(prefix))
        .map((value) => {
            const match = value.match(/(\d+)$/);
            return match ? Number(match[1]) : 0;
        })
        .filter((value) => Number.isFinite(value));

    return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
}

export function formatYearlyNumber(year: number, prefix: string | undefined, sequence: number, padding: number): string {
    return `${year}/${prefix || ''}${String(Math.max(1, sequence)).padStart(Math.max(1, padding), '0')}`;
}
