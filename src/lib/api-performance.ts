type ApiPerformanceMeta = {
    rows?: number;
    payload?: unknown;
    note?: string;
};

function estimatePayloadKb(payload: unknown) {
    try {
        return Math.round(new TextEncoder().encode(JSON.stringify(payload)).length / 1024);
    } catch {
        return null;
    }
}

export function logApiPerformance(label: string, startedAt: number, meta: ApiPerformanceMeta = {}) {
    if (process.env.NODE_ENV === 'production' && process.env.FLOWY_API_PERF_LOG !== '1') {
        return;
    }

    const durationMs = Math.round(performance.now() - startedAt);
    const rows = typeof meta.rows === 'number'
        ? meta.rows
        : Array.isArray(meta.payload)
            ? meta.payload.length
            : undefined;
    const payloadKb = meta.payload === undefined ? null : estimatePayloadKb(meta.payload);

    const parts = [
        `[Perf] ${label}`,
        `${durationMs}ms`,
        rows !== undefined ? `rows=${rows}` : null,
        payloadKb !== null ? `payload=${payloadKb}kb` : null,
        meta.note || null,
    ].filter(Boolean);

    console.log(parts.join(' | '));
}
