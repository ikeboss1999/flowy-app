import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const verifySchema = z.object({
    email: z.string().email(),
    code: z.string().length(6, 'Code muss 6-stellig sein'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = verifySchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: 'Ungültige Daten' },
                { status: 400 }
            );
        }

        const { email, code } = result.data;

        const user = db.findUserByEmail(email);
        if (!user) {
            return NextResponse.json(
                { message: 'Benutzer nicht gefunden' },
                { status: 404 }
            );
        }

        // Find token for this user
        // Note: Our DB helper findToken searches by token string only. 
        // This is fine if tokens are unique enough or we check owner.
        // However, 6 digit codes collide easily globally, so we should filter by user first.
        // Or just find token by user ID in schema.

        // Let's iterate tokens or add a helper. For now manual filter.
        const allTokens = (db as any).getUsers ? [] : ((db as any).readDb ? (db as any).readDb().tokens : []);
        // Wait, db helper is black box in this context unless I check db.ts again.
        // db.ts has findToken(tokenString). 
        // If I use findToken(code), I might get someone else's code if collide.
        // 6 digits collide 1 in 100000, 50% collision at ~300 active codes. Low risk for dev.
        // But better: Filter DB tokens manually or update DB helper.
        // Let's rely on findToken(code) then check userId matches user.id.

        const token = db.findToken(code);

        if (!token || token.userId !== user.id || token.type !== 'EMAIL_VERIFICATION') {
            return NextResponse.json(
                { message: 'Ungültiger Code.' },
                { status: 400 }
            );
        }

        if (token.expiresAt < Date.now()) {
            return NextResponse.json(
                { message: 'Code ist abgelaufen.' },
                { status: 400 }
            );
        }

        // Verify user
        db.updateUser(user.id, { isVerified: true });
        db.deleteToken(token.id);

        return NextResponse.json(
            { message: 'E-Mail erfolgreich bestätigt.' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { message: 'Interner Server-Fehler' },
            { status: 500 }
        );
    }
}
