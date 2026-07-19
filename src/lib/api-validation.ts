import { NextResponse } from 'next/server';
import { z } from 'zod';

export type ParsedJson<T> =
    | { ok: true; data: T }
    | { ok: false; response: NextResponse };

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
    request: Request,
    schema: TSchema
): Promise<ParsedJson<z.infer<TSchema>>> {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
        };
    }

    const result = schema.safeParse(body);
    if (!result.success) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: 'Invalid request body',
                    issues: result.error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            ),
        };
    }

    return { ok: true, data: result.data };
}

export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }

    return request.headers.get('x-real-ip') || 'unknown';
}
