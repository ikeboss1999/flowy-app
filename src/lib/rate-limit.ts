const tracker = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter for server environments (non-serverless or single-instance).
 * For serverless environments like Vercel, infrastructure-level rate limiting is recommended.
 * 
 * @param key Unique key for rate limiting (e.g. client IP or identifier)
 * @param limit Maximum number of allowed requests in the window
 * @param windowMs Time window in milliseconds
 * @returns boolean true if allowed, false if rate limited
 */
export function isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = tracker.get(key);

    if (!record || now > record.resetAt) {
        tracker.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count += 1;
    return true;
}
