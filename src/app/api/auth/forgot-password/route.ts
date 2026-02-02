import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateVerificationToken } from '@/lib/auth';
import { VerificationToken } from '@/lib/types';
import { nanoid } from 'nanoid';

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = forgotPasswordSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: 'Ungültige E-Mail-Adresse' },
                { status: 400 }
            );
        }

        const { email } = result.data;
        const user = db.findUserByEmail(email);

        if (user) {
            // Generate token
            const tokenStr = generateVerificationToken();
            const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour

            const token: VerificationToken = {
                id: nanoid(),
                userId: user.id,
                token: tokenStr,
                type: 'PASSWORD_RESET',
                expiresAt,
                createdAt: new Date().toISOString(),
            };

            db.addToken(token);

            // MOCK EMAIL SENDING
            console.log(`[DEV] Password reset token for ${email}: ${tokenStr}`);
            console.log(`[DEV] Reset Link: http://localhost:3000/reset-password?token=${tokenStr}`);
        }

        // Always return success to prevent email enumeration
        return NextResponse.json(
            { message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
