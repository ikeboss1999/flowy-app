import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword, createSessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export async function POST(req: Request) {
    try {
        // Rate Limiting Logic (IP-based would be better, using email for simplicity here + request headers fallback)
        // Note: In local dev, IP might be ::1.
        const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';

        const now = Date.now();
        const userAttempts = loginAttempts.get(ip);

        if (userAttempts) {
            if (now - userAttempts.firstAttempt > RATE_LIMIT_WINDOW) {
                // Reset if window passed
                loginAttempts.set(ip, { count: 1, firstAttempt: now });
            } else if (userAttempts.count >= MAX_ATTEMPTS) {
                return NextResponse.json(
                    { message: 'Zu viele fehlgeschlagene Versuche. Bitte warten Sie 15 Minuten.' },
                    { status: 429 }
                );
            } else {
                userAttempts.count++;
            }
        } else {
            loginAttempts.set(ip, { count: 1, firstAttempt: now });
        }

        const body = await req.json();
        const result = loginSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: 'Ungültige Eingaben' },
                { status: 400 }
            );
        }

        const { email, password } = result.data;
        const lowerEmail = email.toLowerCase();
        const user = db.getUsers().find(u => u.email.toLowerCase() === lowerEmail);

        if (!user) {
            console.warn(`Login failed: User with email ${lowerEmail} not found`);
            return NextResponse.json(
                { message: 'E-Mail oder Passwort falsch.' },
                { status: 401 }
            );
        }

        const isPasswordCorrect = await verifyPassword(password, user.passwordHash);
        if (!isPasswordCorrect) {
            console.warn(`Login failed: Incorrect password for user ${lowerEmail}`);
            return NextResponse.json(
                { message: 'E-Mail oder Passwort falsch.' },
                { status: 401 }
            );
        }

        // Reset attempts on successful login
        loginAttempts.delete(ip);

        // Create Session
        const token = await createSessionToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Set Cookie
        cookies().set('session_token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        console.log(`Login successful for user: ${user.email}. Setting session cookie.`);

        return NextResponse.json(
            { message: 'Erfolgreich eingeloggt', user: { id: user.id, name: user.name, email: user.email } },
            { status: 200 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: 'Interner Server-Fehler' },
            { status: 500 }
        );
    }
}
