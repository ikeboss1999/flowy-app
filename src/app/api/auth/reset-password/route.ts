import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = resetPasswordSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: 'Ungültige Daten' },
                { status: 400 }
            );
        }

        const { token: tokenStr, password } = result.data;

        // Verify token
        const token = db.findToken(tokenStr);

        if (!token || token.type !== 'PASSWORD_RESET' || token.expiresAt < Date.now()) {
            return NextResponse.json(
                { message: 'Ungültiger oder abgelaufener Token.' },
                { status: 400 }
            );
        }

        // Update password
        const passwordHash = await hashPassword(password);
        db.updateUser(token.userId, { passwordHash });

        // Delete token
        db.deleteToken(token.id);

        return NextResponse.json(
            { message: 'Passwort erfolgreich geändert.' },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
